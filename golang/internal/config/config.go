package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort           string
	DatabaseDSN       string
	Token             string
	BaseURL           string
	CityURL           string
	CallbackURL       string
	Timeout           time.Duration
	AllowAPIKeyUpdate bool
	SyncEnabled       bool
	SyncInterval      time.Duration
	SyncLimit         int
}

func Load() Config {
	_ = godotenv.Load()

	timeoutSeconds, err := strconv.Atoi(env("MOLIZHISHU_TIMEOUT_SECONDS", "30"))
	if err != nil || timeoutSeconds <= 0 {
		timeoutSeconds = 30
	}
	syncIntervalSeconds, err := strconv.Atoi(env("MOLIZHISHU_SYNC_INTERVAL_SECONDS", "60"))
	if err != nil || syncIntervalSeconds <= 0 {
		syncIntervalSeconds = 60
	}
	syncLimit, err := strconv.Atoi(env("MOLIZHISHU_SYNC_LIMIT", "20"))
	if err != nil || syncLimit <= 0 {
		syncLimit = 20
	}

	return Config{
		AppPort:           env("APP_PORT", "18082"),
		DatabaseDSN:       env("DATABASE_DSN", ""),
		Token:             os.Getenv("MOLIZHISHU_TOKEN"),
		BaseURL:           env("MOLIZHISHU_BASE_URL", "https://business-api.molizhishu.com/api/business/monitor"),
		CityURL:           env("MOLIZHISHU_CITY_URL", "https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info"),
		CallbackURL:       os.Getenv("MOLIZHISHU_CALLBACK_URL"),
		Timeout:           time.Duration(timeoutSeconds) * time.Second,
		AllowAPIKeyUpdate: env("MOLIZHISHU_ALLOW_API_KEY_UPDATE", "false") == "true",
		SyncEnabled:       env("MOLIZHISHU_SYNC_ENABLED", "true") != "false",
		SyncInterval:      time.Duration(syncIntervalSeconds) * time.Second,
		SyncLimit:         syncLimit,
	}
}

func env(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
