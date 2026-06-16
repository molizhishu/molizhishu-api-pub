use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::{Value, json};

/// Local API result type using the frontend-compatible response envelope.
pub(crate) type ApiResult = Result<Json<Value>, ApiError>;

pub(crate) fn ok(data: Value) -> ApiResult {
    Ok(Json(json!({"success": true, "data": data})))
}

pub(crate) fn err(status: StatusCode, message: impl Into<String>, code: Option<i64>) -> ApiResult {
    Err(ApiError::new(status, message, code))
}

/// Error converted to a JSON response envelope.
#[derive(Debug)]
pub(crate) struct ApiError {
    status: StatusCode,
    message: String,
    code: Option<i64>,
}

impl ApiError {
    pub(crate) fn new(status: StatusCode, message: impl Into<String>, code: Option<i64>) -> Self {
        Self {
            status,
            message: message.into(),
            code,
        }
    }

    pub(crate) fn message(&self) -> &str {
        &self.message
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(value: anyhow::Error) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, value.to_string(), None)
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(value: sqlx::Error) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, value.to_string(), None)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({"success": false, "code": self.code, "message": self.message})),
        )
            .into_response()
    }
}
