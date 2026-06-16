use std::{sync::Arc, time::Duration};

use reqwest::Method;
use serde_json::Value;

use crate::{
    client::remote,
    repository::{save_remote_result, unfinished_task_ids},
    response::ApiError,
    state::AppState,
};

/// Synchronizes one task by first saving status and then saving result data when available.
pub(crate) async fn sync_one(
    state: &AppState,
    task_id: &str,
    source: &str,
) -> Result<Value, ApiError> {
    let started = std::time::Instant::now();
    let status = remote(
        state,
        Method::GET,
        &format!("/task/status/{task_id}"),
        None,
        &format!("{source}:status"),
        false,
    )
    .await?;
    save_remote_result(&state.pool, &status)
        .await
        .map_err(ApiError::from)?;

    let fetch_result = terminal_status(status.get("status").and_then(Value::as_str).unwrap_or(""))
        || has_completed_items(&status);
    let data = if fetch_result {
        let result = remote(
            state,
            Method::GET,
            &format!("/task/result/{task_id}"),
            None,
            &format!("{source}:result"),
            false,
        )
        .await?;
        save_remote_result(&state.pool, &result)
            .await
            .map_err(ApiError::from)?;
        result
    } else {
        status
    };

    println!(
        "[sync] source={source} task_id={task_id} status={} fetch_result={fetch_result} duration={}ms",
        data.get("status")
            .and_then(Value::as_str)
            .unwrap_or("unknown"),
        started.elapsed().as_millis()
    );
    Ok(data)
}

/// Runs the Rust in-process scheduled compensation loop.
pub(crate) async fn sync_loop(state: Arc<AppState>) {
    let interval_seconds = state.config.sync_interval_seconds.max(1);
    println!(
        "[sync] background sync started interval={}s limit={}",
        interval_seconds, state.config.sync_limit
    );
    let mut ticker = tokio::time::interval(Duration::from_secs(interval_seconds));
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    loop {
        ticker.tick().await;
        sync_unfinished(&state, "rust-sync-loop").await;
    }
}

async fn sync_unfinished(state: &AppState, source: &str) {
    let task_ids = match unfinished_task_ids(&state.pool, state.config.sync_limit).await {
        Ok(value) => value,
        Err(error) => {
            println!("[sync] source={source} failed=true error=\"{error}\"");
            return;
        }
    };
    let mut synced = 0;
    let mut failed = 0;
    for task_id in &task_ids {
        match sync_one(state, task_id, source).await {
            Ok(_) => synced += 1,
            Err(error) => {
                failed += 1;
                println!(
                    "[sync] source={source} task_id={task_id} failed=true error=\"{}\"",
                    error.message()
                );
            }
        }
    }
    println!(
        "[sync] source={source} total={} synced={synced} failed={failed}",
        task_ids.len()
    );
}

fn terminal_status(status: &str) -> bool {
    matches!(
        status,
        "completed" | "partial_completed" | "failed" | "stopped"
    )
}

fn has_completed_items(status: &Value) -> bool {
    if status
        .get("completedItems")
        .and_then(Value::as_i64)
        .unwrap_or(0)
        > 0
    {
        return true;
    }
    status
        .get("subTaskList")
        .and_then(Value::as_array)
        .map(|rows| {
            rows.iter().any(|item| {
                terminal_status(item.get("status").and_then(Value::as_str).unwrap_or(""))
            })
        })
        .unwrap_or(false)
}
