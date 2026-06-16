use chrono::{Local, NaiveDateTime};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::Row;

/// Masks a server-side token for the settings page.
pub(crate) fn mask(token: &str) -> Value {
    if token.trim().is_empty() {
        return json!({"configured": false, "masked": null, "last4": null});
    }
    let last4 = if token.len() > 4 {
        &token[token.len() - 4..]
    } else {
        token
    };
    json!({"configured": true, "masked": format!("{}{}", "*".repeat((token.len().saturating_sub(4)).max(8)), last4), "last4": last4})
}

pub(crate) fn get_string(row: &sqlx::mysql::MySqlRow, key: &str) -> String {
    row.try_get::<String, _>(key).unwrap_or_default()
}

pub(crate) fn get_opt_string(row: &sqlx::mysql::MySqlRow, key: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(key).unwrap_or(None)
}

pub(crate) fn get_json_string(row: &sqlx::mysql::MySqlRow, key: &str) -> String {
    row.try_get::<Value, _>(key)
        .map(|value| json_text(&value))
        .or_else(|_| row.try_get::<String, _>(key))
        .unwrap_or_default()
}

pub(crate) fn get_opt_json_string(row: &sqlx::mysql::MySqlRow, key: &str) -> Option<String> {
    match row.try_get::<Option<Value>, _>(key) {
        Ok(Some(value)) => Some(json_text(&value)),
        Ok(None) => None,
        Err(_) => row.try_get::<Option<String>, _>(key).unwrap_or(None),
    }
}

pub(crate) fn get_i64(row: &sqlx::mysql::MySqlRow, key: &str) -> i64 {
    row.try_get::<i64, _>(key).unwrap_or_default()
}

pub(crate) fn get_opt_i64(row: &sqlx::mysql::MySqlRow, key: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(key).unwrap_or(None)
}

pub(crate) fn get_datetime(row: &sqlx::mysql::MySqlRow, key: &str) -> String {
    row.try_get::<NaiveDateTime, _>(key)
        .map(|v| v.to_string())
        .unwrap_or_default()
}

pub(crate) fn get_opt_datetime(row: &sqlx::mysql::MySqlRow, key: &str) -> Option<String> {
    row.try_get::<Option<NaiveDateTime>, _>(key)
        .unwrap_or(None)
        .map(|v| v.to_string())
}

pub(crate) fn normalize_bcrypt(hash: &str) -> String {
    hash.replacen("$2y$", "$2a$", 1)
}

pub(crate) fn sha256(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}

pub(crate) fn json_text(value: &Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "null".to_string())
}

pub(crate) fn now_string() -> String {
    Local::now()
        .naive_local()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string()
}
