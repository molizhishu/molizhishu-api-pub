use std::sync::RwLock;

use sqlx::MySqlPool;

use crate::config::Config;

/// Shared application state injected into Axum handlers and background jobs.
pub(crate) struct AppState {
    pub(crate) pool: MySqlPool,
    pub(crate) client: reqwest::Client,
    pub(crate) config: Config,
    pub(crate) runtime_token: RwLock<String>,
}

impl AppState {
    pub(crate) fn token(&self) -> String {
        self.runtime_token
            .read()
            .map(|token| token.clone())
            .unwrap_or_else(|_| self.config.token.clone())
    }

    pub(crate) fn update_token(&self, token: String) {
        if let Ok(mut runtime_token) = self.runtime_token.write() {
            *runtime_token = token;
        }
    }
}
