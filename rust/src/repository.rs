use serde_json::{Value, json};
use sqlx::{MySqlPool, Row};

use crate::util::{
    get_datetime, get_i64, get_json_string, get_opt_datetime, get_opt_i64, get_opt_json_string,
    get_opt_string, get_string, json_text, now_string, sha256,
};

/// Lists tasks for the management UI with optional status filtering.
pub(crate) async fn list_tasks(
    pool: &MySqlPool,
    page: u64,
    size: u64,
    status: Option<String>,
) -> anyhow::Result<(i64, Vec<Value>)> {
    let offset = ((page - 1) * size) as i64;
    let limit = size as i64;
    let (total, rows) = if let Some(status) = status {
        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM geo_tasks WHERE status=?")
            .bind(&status)
            .fetch_one(pool)
            .await?;
        let rows = sqlx::query(
            "SELECT * FROM geo_tasks WHERE status=? ORDER BY created_local_at DESC LIMIT ? OFFSET ?",
        )
        .bind(&status)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;
        (total, rows)
    } else {
        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM geo_tasks")
            .fetch_one(pool)
            .await?;
        let rows =
            sqlx::query("SELECT * FROM geo_tasks ORDER BY created_local_at DESC LIMIT ? OFFSET ?")
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await?;
        (total, rows)
    };
    Ok((total, rows.iter().map(task_row).collect()))
}

/// Loads one task with subtasks and recent callback events for the detail page.
pub(crate) async fn task_detail(pool: &MySqlPool, task_id: &str) -> anyhow::Result<Option<Value>> {
    let row = sqlx::query("SELECT * FROM geo_tasks WHERE task_id=?")
        .bind(task_id)
        .fetch_optional(pool)
        .await?;
    let Some(row) = row else {
        return Ok(None);
    };

    let mut task = task_row(&row);
    let subtasks =
        sqlx::query("SELECT * FROM geo_subtasks WHERE task_id=? ORDER BY updated_at DESC")
            .bind(task_id)
            .fetch_all(pool)
            .await?;
    let events = sqlx::query(
        "SELECT * FROM geo_callback_events WHERE task_id=? ORDER BY received_at DESC LIMIT 20",
    )
    .bind(task_id)
    .fetch_all(pool)
    .await?;

    task["subTaskList"] = Value::Array(subtasks.iter().map(subtask_row).collect());
    task["callbackEvents"] = Value::Array(events.iter().map(callback_row).collect());
    Ok(Some(task))
}

/// Persists a freshly submitted task and its initial subtask summary.
pub(crate) async fn save_submitted(
    pool: &MySqlPool,
    request: &Value,
    response: &Value,
) -> anyhow::Result<()> {
    let now = now_string();
    let task_id = response.get("taskId").and_then(Value::as_str).unwrap_or("");
    sqlx::query("INSERT INTO geo_tasks (task_id,status,prompts_json,platforms_json,region_code_json,callback_url,total_items,completed_items,failed_items,poll_url,raw_request_json,raw_response_json,created_local_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),prompts_json=VALUES(prompts_json),platforms_json=VALUES(platforms_json),region_code_json=VALUES(region_code_json),callback_url=VALUES(callback_url),total_items=VALUES(total_items),poll_url=VALUES(poll_url),raw_request_json=VALUES(raw_request_json),raw_response_json=VALUES(raw_response_json),updated_at=VALUES(updated_at)")
        .bind(task_id)
        .bind(response.get("status").and_then(Value::as_str).unwrap_or("pending"))
        .bind(json_text(request.get("prompts").unwrap_or(&json!([]))))
        .bind(json_text(request.get("platforms").unwrap_or(&json!([]))))
        .bind(json_text(request.get("regionCode").unwrap_or(&json!([]))))
        .bind(response.get("callbackUrl").and_then(Value::as_str).or_else(|| request.get("callbackUrl").and_then(Value::as_str)))
        .bind(response.get("totalTask").or_else(|| response.get("totalItems")).and_then(Value::as_i64).unwrap_or(0))
        .bind(0)
        .bind(0)
        .bind(response.get("pollUrl").and_then(Value::as_str))
        .bind(json_text(request))
        .bind(json_text(response))
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;
    upsert_subtasks(
        pool,
        task_id,
        response.get("subTaskList").and_then(Value::as_array),
        &now,
    )
    .await?;
    Ok(())
}

/// Persists a status/result/callback payload returned by Molizhishu.
pub(crate) async fn save_remote_result(pool: &MySqlPool, payload: &Value) -> anyhow::Result<()> {
    let now = now_string();
    let task_id = payload.get("taskId").and_then(Value::as_str).unwrap_or("");
    sqlx::query("INSERT INTO geo_tasks (task_id,status,prompts_json,platforms_json,region_code_json,total_items,completed_items,failed_items,created_at,completed_at,raw_request_json,raw_response_json,created_local_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),total_items=VALUES(total_items),completed_items=VALUES(completed_items),failed_items=VALUES(failed_items),created_at=VALUES(created_at),completed_at=VALUES(completed_at),raw_response_json=VALUES(raw_response_json),updated_at=VALUES(updated_at)")
        .bind(task_id)
        .bind(payload.get("status").and_then(Value::as_str).unwrap_or("processing"))
        .bind("[]")
        .bind("[]")
        .bind("[]")
        .bind(payload.get("totalItems").and_then(Value::as_i64).unwrap_or(0))
        .bind(payload.get("completedItems").and_then(Value::as_i64).unwrap_or(0))
        .bind(payload.get("failedItems").and_then(Value::as_i64).unwrap_or(0))
        .bind(payload.get("createdAt").and_then(Value::as_i64))
        .bind(payload.get("completedAt").or_else(|| payload.get("timestamp")).and_then(Value::as_i64))
        .bind("{}")
        .bind(json_text(payload))
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;
    upsert_subtasks(
        pool,
        task_id,
        payload.get("subTaskList").and_then(Value::as_array),
        &now,
    )
    .await?;
    Ok(())
}

/// Records a callback payload idempotently and applies its latest task state.
pub(crate) async fn save_callback(pool: &MySqlPool, payload: &Value) -> anyhow::Result<bool> {
    let raw = json_text(payload);
    let hash = sha256(&raw);
    let task_id = payload.get("taskId").and_then(Value::as_str).unwrap_or("");
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM geo_callback_events WHERE task_id=? AND payload_hash=? AND process_status='processed'")
        .bind(task_id).bind(&hash).fetch_one(pool).await?;
    if exists > 0 {
        sqlx::query("INSERT INTO geo_callback_events (task_id,payload_json,payload_hash,process_status,received_at,processed_at) VALUES (?,?,?,'duplicate',NOW(),NOW())")
            .bind(task_id).bind(raw).bind(hash).execute(pool).await?;
        return Ok(true);
    }
    sqlx::query("INSERT INTO geo_callback_events (task_id,payload_json,payload_hash,process_status,received_at,processed_at) VALUES (?,?,?,'processed',NOW(),NOW())")
        .bind(task_id).bind(raw).bind(hash).execute(pool).await?;
    save_remote_result(pool, payload).await?;
    Ok(false)
}

/// Returns task IDs that still need status/result compensation.
pub(crate) async fn unfinished_task_ids(
    pool: &MySqlPool,
    limit: i64,
) -> anyhow::Result<Vec<String>> {
    let rows = sqlx::query_scalar::<_, String>("SELECT t.task_id FROM geo_tasks t LEFT JOIN geo_subtasks s ON s.task_id = t.task_id WHERE t.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped') OR s.subtask_id IS NULL OR s.status IS NULL OR s.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped') OR (t.status IN ('completed', 'partial_completed') AND s.status = 'completed' AND (s.answer_content IS NULL OR s.answer_content = '')) GROUP BY t.task_id ORDER BY MIN(t.created_local_at) ASC LIMIT ?")
        .bind(limit.max(1))
        .fetch_all(pool)
        .await?;
    Ok(rows)
}

async fn upsert_subtasks(
    pool: &MySqlPool,
    task_id: &str,
    rows: Option<&Vec<Value>>,
    now: &str,
) -> anyhow::Result<()> {
    for row in rows.into_iter().flatten() {
        let subtask_id = row.get("subTaskId").and_then(Value::as_str).unwrap_or("");
        if subtask_id.is_empty() {
            continue;
        }
        sqlx::query("INSERT INTO geo_subtasks (subtask_id,task_id,platform,mode,prompt,status,time,page_screenshot,answer_content,reference_list_json,citation_list_json,reasoning_process_json,recommended_questions_json,media_content_json,error_message,proxy_ip,raw_result_json,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE platform=VALUES(platform),mode=VALUES(mode),prompt=VALUES(prompt),status=VALUES(status),time=VALUES(time),page_screenshot=VALUES(page_screenshot),answer_content=VALUES(answer_content),reference_list_json=VALUES(reference_list_json),citation_list_json=VALUES(citation_list_json),reasoning_process_json=VALUES(reasoning_process_json),recommended_questions_json=VALUES(recommended_questions_json),media_content_json=VALUES(media_content_json),error_message=VALUES(error_message),proxy_ip=VALUES(proxy_ip),raw_result_json=VALUES(raw_result_json),updated_at=VALUES(updated_at)")
            .bind(subtask_id)
            .bind(task_id)
            .bind(row.get("platform").and_then(Value::as_str))
            .bind(row.get("mode").and_then(Value::as_str))
            .bind(row.get("prompt").and_then(Value::as_str))
            .bind(row.get("status").and_then(Value::as_str))
            .bind(row.get("time").and_then(Value::as_i64))
            .bind(row.get("pageScreenshot").and_then(Value::as_str))
            .bind(row.get("answerContent").and_then(Value::as_str))
            .bind(json_text(row.get("referenceList").unwrap_or(&json!([]))))
            .bind(json_text(row.get("citationList").unwrap_or(&json!([]))))
            .bind(json_text(row.get("reasoningProcess").unwrap_or(&Value::Null)))
            .bind(json_text(row.get("recommendedQuestions").unwrap_or(&json!([]))))
            .bind(json_text(row.get("mediaContent").unwrap_or(&json!([]))))
            .bind(row.get("errorMessage").and_then(Value::as_str))
            .bind(row.get("proxyIp").and_then(Value::as_str))
            .bind(json_text(row))
            .bind(now)
            .execute(pool)
            .await?;
    }
    Ok(())
}

/// Converts a task database row to the frontend-compatible JSON shape.
pub(crate) fn task_row(row: &sqlx::mysql::MySqlRow) -> Value {
    json!({
        "task_id": get_string(row, "task_id"), "status": get_string(row, "status"),
        "prompts_json": get_json_string(row, "prompts_json"), "platforms_json": get_json_string(row, "platforms_json"),
        "region_code_json": get_json_string(row, "region_code_json"), "callback_url": get_opt_string(row, "callback_url"),
        "total_items": get_i64(row, "total_items"), "completed_items": get_i64(row, "completed_items"),
        "failed_items": get_i64(row, "failed_items"), "poll_url": get_opt_string(row, "poll_url"),
        "created_at": get_opt_i64(row, "created_at"), "completed_at": get_opt_i64(row, "completed_at"),
        "raw_request_json": get_json_string(row, "raw_request_json"), "raw_response_json": get_opt_json_string(row, "raw_response_json"),
        "last_error": get_opt_string(row, "last_error"), "created_local_at": get_datetime(row, "created_local_at"),
        "updated_at": get_datetime(row, "updated_at")
    })
}

/// Converts a subtask database row to the frontend-compatible JSON shape.
pub(crate) fn subtask_row(row: &sqlx::mysql::MySqlRow) -> Value {
    json!({
        "subtask_id": get_string(row, "subtask_id"), "task_id": get_string(row, "task_id"), "platform": get_opt_string(row, "platform"),
        "mode": get_opt_string(row, "mode"), "prompt": get_opt_string(row, "prompt"), "status": get_opt_string(row, "status"),
        "time": get_opt_i64(row, "time"), "page_screenshot": get_opt_string(row, "page_screenshot"),
        "answer_content": get_opt_string(row, "answer_content"), "reference_list_json": get_opt_json_string(row, "reference_list_json"),
        "citation_list_json": get_opt_json_string(row, "citation_list_json"), "reasoning_process_json": get_opt_json_string(row, "reasoning_process_json"),
        "recommended_questions_json": get_opt_json_string(row, "recommended_questions_json"), "media_content_json": get_opt_json_string(row, "media_content_json"),
        "error_message": get_opt_string(row, "error_message"), "proxy_ip": get_opt_string(row, "proxy_ip"),
        "raw_result_json": get_opt_json_string(row, "raw_result_json"), "updated_at": get_datetime(row, "updated_at")
    })
}

/// Converts a callback event row to the frontend-compatible JSON shape.
pub(crate) fn callback_row(row: &sqlx::mysql::MySqlRow) -> Value {
    json!({
        "id": get_i64(row, "id"), "task_id": get_string(row, "task_id"), "payload_json": get_json_string(row, "payload_json"),
        "payload_hash": get_string(row, "payload_hash"), "process_status": get_string(row, "process_status"),
        "error_message": get_opt_string(row, "error_message"), "received_at": get_datetime(row, "received_at"),
        "processed_at": get_opt_datetime(row, "processed_at")
    })
}

/// Returns the public user payload used by the shared frontend login flow.
pub(crate) fn public_user(row: &sqlx::mysql::MySqlRow) -> Value {
    json!({"id": row.try_get::<u64, _>("id").unwrap_or_default(), "username": get_string(row, "username"), "displayName": get_string(row, "display_name"), "role": get_string(row, "role")})
}
