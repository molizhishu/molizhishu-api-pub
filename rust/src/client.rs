use axum::http::StatusCode;
use reqwest::Method;
use serde_json::Value;

use crate::{response::ApiError, state::AppState};

/// Calls the Molizhishu API and unwraps the shared response envelope.
///
/// The caller provides a short `source` tag so logs clearly show whether the
/// remote call came from submission, manual sync, scheduled sync, or settings.
pub(crate) async fn remote(
    state: &AppState,
    method: Method,
    path_or_url: &str,
    payload: Option<Value>,
    source: &str,
    absolute: bool,
) -> Result<Value, ApiError> {
    let token = state.token();
    if token.is_empty() {
        return Err(ApiError::new(
            StatusCode::BAD_GATEWAY,
            "MOLIZHISHU_TOKEN 未配置",
            None,
        ));
    }

    let url = if absolute {
        path_or_url.to_string()
    } else {
        format!("{}{}", state.config.base_url, path_or_url)
    };
    let started = std::time::Instant::now();
    let mut request = state
        .client
        .request(method.clone(), &url)
        .bearer_auth(&token)
        .header("Accept", "application/json");
    if let Some(payload) = payload {
        request = request.json(&payload);
    }

    let response = request.send().await.map_err(|error| {
        ApiError::new(
            StatusCode::BAD_GATEWAY,
            format!("模力指数接口网络异常：{error}"),
            None,
        )
    })?;
    let http_status = response.status();
    let envelope: Value = response
        .json()
        .await
        .map_err(|_| ApiError::new(StatusCode::BAD_GATEWAY, "模力指数接口返回非 JSON", None))?;
    let success = envelope
        .get("success")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let code = envelope.get("code").and_then(Value::as_i64);
    let message = envelope
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("");

    println!(
        "[molizhishu] source={source} method={} url={url} http_status={} success={success} code={code:?} message=\"{message}\" duration={}ms",
        method.as_str(),
        http_status.as_u16(),
        started.elapsed().as_millis()
    );

    if !http_status.is_success() {
        return Err(ApiError::new(
            StatusCode::from_u16(http_status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            format!("模力指数 HTTP 异常：{}", http_status.as_u16()),
            code,
        ));
    }
    if !success {
        return Err(ApiError::new(
            StatusCode::BAD_GATEWAY,
            if message.is_empty() {
                "模力指数业务处理失败".to_string()
            } else {
                message.to_string()
            },
            code,
        ));
    }

    Ok(envelope.get("data").cloned().unwrap_or(Value::Null))
}
