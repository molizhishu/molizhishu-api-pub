use std::env;

/// Environment-backed configuration for the Rust/Axum demo.
#[derive(Clone)]
pub(crate) struct Config {
    pub(crate) port: u16,
    pub(crate) token: String,
    pub(crate) base_url: String,
    pub(crate) city_url: String,
    pub(crate) callback_url: String,
    pub(crate) allow_api_key_update: bool,
    pub(crate) sync_enabled: bool,
    pub(crate) sync_interval_seconds: u64,
    pub(crate) sync_limit: i64,
}

impl Config {
    pub(crate) fn load() -> Self {
        Self {
            port: env_or("APP_PORT", "18085").parse().unwrap_or(18085),
            token: env_or("MOLIZHISHU_TOKEN", ""),
            base_url: env_or(
                "MOLIZHISHU_BASE_URL",
                "https://business-api.molizhishu.com/api/business/monitor",
            )
            .trim_end_matches('/')
            .to_string(),
            city_url: env_or(
                "MOLIZHISHU_CITY_URL",
                "https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info",
            ),
            callback_url: env_or("MOLIZHISHU_CALLBACK_URL", ""),
            allow_api_key_update: env_or("MOLIZHISHU_ALLOW_API_KEY_UPDATE", "false") == "true",
            sync_enabled: env_or("MOLIZHISHU_SYNC_ENABLED", "true") != "false",
            sync_interval_seconds: env_or("MOLIZHISHU_SYNC_INTERVAL_SECONDS", "60")
                .parse()
                .unwrap_or(60),
            sync_limit: env_or("MOLIZHISHU_SYNC_LIMIT", "20").parse().unwrap_or(20),
        }
    }
}

pub(crate) fn env_or(key: &str, fallback: &str) -> String {
    env::var(key).unwrap_or_else(|_| fallback.to_string())
}
