use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, RwLock},
    time::Duration,
};

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
};
use bcrypt::verify;
use chrono::Local;
use reqwest::Method;
use serde_json::{Value, json};
use sqlx::{Row, mysql::MySqlPoolOptions};
use uuid::Uuid;

mod client;
mod config;
mod repository;
mod response;
mod state;
mod syncer;
mod util;

use crate::client::remote;
use crate::config::{Config, env_or};
use crate::repository::{
    list_tasks as repo_list_tasks, public_user, save_callback, save_submitted, task_detail,
};
use crate::response::{ApiError, ApiResult, err, ok};
use crate::state::AppState;
use crate::syncer::{sync_loop, sync_one};
use crate::util::{mask, normalize_bcrypt, sha256};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Config::load();
    let database_url = env_or(
        "DATABASE_URL",
        "mysql://root:@127.0.0.1:3306/molizhishu",
    );
    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;
    let timeout = env_or("MOLIZHISHU_TIMEOUT_SECONDS", "30")
        .parse::<u64>()
        .unwrap_or(30);
    let state = Arc::new(AppState {
        pool,
        client: reqwest::Client::builder()
            .timeout(Duration::from_secs(timeout))
            .build()?,
        runtime_token: RwLock::new(config.token.clone()),
        config,
    });
    if state.config.sync_enabled {
        tokio::spawn(sync_loop(state.clone()));
    } else {
        println!("[sync] background sync disabled");
    }

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/auth/login", post(login))
        .route("/api/auth/me", get(me))
        .route("/api/auth/logout", post(logout))
        .route("/api/tasks", post(create_task).get(list_tasks))
        .route("/api/tasks/{task_id}", get(get_task))
        .route("/api/tasks/{task_id}/sync", post(sync_task))
        .route("/api/tasks/{task_id}/stop", put(stop_task))
        .route("/webhooks/molizhishu", post(callback))
        .route(
            "/api/callback-url",
            get(get_callback_url).put(update_callback_url),
        )
        .route("/api/cities", get(cities))
        .route("/api/settings", get(settings))
        .route("/api/settings/api-key", put(update_api_key))
        .with_state(state.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], state.config.port));
    println!("molizhishu-api-pub-rust listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health(State(state): State<Arc<AppState>>) -> ApiResult {
    ok(json!({"service": "molizhishu-api-pub-rust", "status": "ok", "port": state.config.port}))
}

async fn login(State(state): State<Arc<AppState>>, Json(payload): Json<Value>) -> ApiResult {
    let username = payload
        .get("username")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    let password = payload
        .get("password")
        .and_then(Value::as_str)
        .unwrap_or("");
    let user = sqlx::query("SELECT id, username, password_hash, display_name, role FROM geo_admin_users WHERE username=? AND status=1")
        .bind(username)
        .fetch_optional(&state.pool)
        .await?;
    let Some(row) = user else {
        return err(StatusCode::UNAUTHORIZED, "账号或密码不正确", None);
    };
    let password_hash: String = row.try_get("password_hash")?;
    if password.is_empty() || !verify(password, &normalize_bcrypt(&password_hash)).unwrap_or(false)
    {
        return err(StatusCode::UNAUTHORIZED, "账号或密码不正确", None);
    }
    let token = Uuid::new_v4().simple().to_string() + &Uuid::new_v4().simple().to_string();
    let expires_at = Local::now().naive_local() + chrono::Duration::days(7);
    sqlx::query("UPDATE geo_admin_users SET auth_token_hash=?, token_expires_at=?, last_login_at=NOW(), updated_at=NOW() WHERE id=?")
        .bind(sha256(&token))
        .bind(expires_at)
        .bind(row.get::<u64, _>("id"))
        .execute(&state.pool)
        .await?;
    ok(
        json!({"token": token, "expiresAt": expires_at.format("%Y-%m-%d %H:%M:%S").to_string(), "user": public_user(&row)}),
    )
}

async fn me(State(state): State<Arc<AppState>>, headers: HeaderMap) -> ApiResult {
    let user = require_auth(&state, &headers).await?;
    ok(public_user(&user))
}

async fn logout(State(state): State<Arc<AppState>>, headers: HeaderMap) -> ApiResult {
    let user = require_auth(&state, &headers).await?;
    sqlx::query("UPDATE geo_admin_users SET auth_token_hash=NULL, token_expires_at=NULL, updated_at=NOW() WHERE id=?")
        .bind(user.get::<u64, _>("id"))
        .execute(&state.pool)
        .await?;
    ok(json!(true))
}

async fn create_task(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(mut payload): Json<Value>,
) -> ApiResult {
    require_auth(&state, &headers).await?;
    if let Some(message) = validate_submit(&payload) {
        return err(StatusCode::UNPROCESSABLE_ENTITY, message, None);
    }
    if payload.get("callbackUrl").is_none() && !state.config.callback_url.is_empty() {
        payload["callbackUrl"] = json!(state.config.callback_url);
    }
    let data = remote(
        &state,
        Method::POST,
        "/task/batch/shared",
        Some(payload.clone()),
        "local-api:submit-task",
        false,
    )
    .await?;
    save_submitted(&state.pool, &payload, &data).await?;
    ok(data)
}

async fn list_tasks(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<HashMap<String, String>>,
) -> ApiResult {
    require_auth(&state, &headers).await?;
    let page = params
        .get("page")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(1)
        .max(1);
    let size = params
        .get("size")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(20)
        .clamp(1, 100);
    let status = params.get("status").filter(|v| !v.is_empty()).cloned();
    let (total, items) = repo_list_tasks(&state.pool, page, size, status).await?;
    ok(json!({"page": page, "size": size, "total": total, "items": items}))
}

async fn get_task(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(task_id): Path<String>,
) -> ApiResult {
    require_auth(&state, &headers).await?;
    let Some(task) = task_detail(&state.pool, &task_id).await? else {
        return err(StatusCode::NOT_FOUND, "任务不存在", None);
    };
    ok(task)
}

async fn sync_task(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(task_id): Path<String>,
) -> ApiResult {
    require_auth(&state, &headers).await?;
    ok(sync_one(&state, &task_id, "local-api:manual-compensation").await?)
}

async fn stop_task(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(task_id): Path<String>,
) -> ApiResult {
    require_auth(&state, &headers).await?;
    let message = remote(
        &state,
        Method::PUT,
        &format!("/task/{task_id}/stop"),
        None,
        "local-api:stop-task",
        false,
    )
    .await?;
    ok(json!({"message": message}))
}

async fn callback(State(state): State<Arc<AppState>>, Json(payload): Json<Value>) -> ApiResult {
    if payload
        .get("taskId")
        .and_then(Value::as_str)
        .unwrap_or("")
        .is_empty()
        || payload
            .get("status")
            .and_then(Value::as_str)
            .unwrap_or("")
            .is_empty()
    {
        return err(StatusCode::BAD_REQUEST, "taskId 和 status 必填", None);
    }
    let duplicate = save_callback(&state.pool, &payload).await?;
    ok(json!({"duplicate": duplicate}))
}

async fn get_callback_url(State(state): State<Arc<AppState>>, headers: HeaderMap) -> ApiResult {
    require_auth(&state, &headers).await?;
    ok(remote(
        &state,
        Method::GET,
        "/task/callback-url",
        None,
        "local-api:callback-url:get",
        false,
    )
    .await?)
}

async fn update_callback_url(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<Value>,
) -> ApiResult {
    require_auth(&state, &headers).await?;
    ok(remote(
        &state,
        Method::PUT,
        "/task/callback-url",
        Some(json!({"callbackUrl": payload.get("callbackUrl").cloned().unwrap_or(Value::Null)})),
        "local-api:callback-url:update",
        false,
    )
    .await?)
}

async fn cities(State(state): State<Arc<AppState>>, headers: HeaderMap) -> ApiResult {
    require_auth(&state, &headers).await?;
    ok(remote(
        &state,
        Method::GET,
        &state.config.city_url,
        None,
        "local-api:cities",
        true,
    )
    .await?)
}

async fn settings(State(state): State<Arc<AppState>>, headers: HeaderMap) -> ApiResult {
    require_auth(&state, &headers).await?;
    ok(
        json!({"apiKey": mask(&state.token()), "security": {"apiKeyUpdateAllowed": state.config.allow_api_key_update}}),
    )
}

async fn update_api_key(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<Value>,
) -> ApiResult {
    require_auth(&state, &headers).await?;
    if !state.config.allow_api_key_update {
        return err(
            StatusCode::FORBIDDEN,
            "当前环境禁止在页面修改 API Key",
            None,
        );
    }

    let api_key = payload
        .get("apiKey")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if api_key.is_empty() {
        return err(StatusCode::UNPROCESSABLE_ENTITY, "API Key 不能为空", None);
    }

    state.update_token(api_key.to_string());
    ok(
        json!({"apiKey": mask(&state.token()), "security": {"apiKeyUpdateAllowed": state.config.allow_api_key_update}}),
    )
}

async fn require_auth(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<sqlx::mysql::MySqlRow, ApiError> {
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .trim_start_matches("Bearer ")
        .trim();
    if token.is_empty() {
        return Err(ApiError::new(StatusCode::UNAUTHORIZED, "请先登录", None));
    }
    let row = sqlx::query("SELECT id, username, display_name, role FROM geo_admin_users WHERE auth_token_hash=? AND status=1 AND token_expires_at > NOW()")
        .bind(sha256(token))
        .fetch_optional(&state.pool)
        .await
        .map_err(ApiError::from)?;
    row.ok_or_else(|| ApiError::new(StatusCode::UNAUTHORIZED, "请先登录", None))
}

fn validate_submit(payload: &Value) -> Option<&'static str> {
    let Some(prompts) = payload.get("prompts").and_then(Value::as_array) else {
        return Some("prompts 必须是非空数组");
    };
    if prompts.is_empty() {
        return Some("prompts 必须是非空数组");
    }
    if prompts.len() > 50 {
        return Some("prompts 最多 50 个");
    }
    let Some(platforms) = payload.get("platforms").and_then(Value::as_array) else {
        return Some("platforms 必须是非空数组");
    };
    if platforms.is_empty() {
        return Some("platforms 必须是非空数组");
    }
    for item in platforms {
        if item
            .get("platform")
            .and_then(Value::as_str)
            .unwrap_or("")
            .is_empty()
            || item
                .get("mode")
                .and_then(Value::as_str)
                .unwrap_or("")
                .is_empty()
        {
            return Some("platforms 每一项必须包含 platform 和 mode");
        }
    }
    None
}
