from functools import lru_cache
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    app_port: int = int(os.getenv("APP_PORT", "18083"))
    database_url: str = os.getenv("DATABASE_URL", "")
    token: str = os.getenv("MOLIZHISHU_TOKEN", "")
    base_url: str = os.getenv("MOLIZHISHU_BASE_URL", "https://business-api.molizhishu.com/api/business/monitor")
    city_url: str = os.getenv("MOLIZHISHU_CITY_URL", "https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info")
    callback_url: str = os.getenv("MOLIZHISHU_CALLBACK_URL", "")
    timeout_seconds: int = int(os.getenv("MOLIZHISHU_TIMEOUT_SECONDS", "30"))
    allow_api_key_update: bool = os.getenv("MOLIZHISHU_ALLOW_API_KEY_UPDATE", "false").lower() == "true"
    sync_enabled: bool = os.getenv("MOLIZHISHU_SYNC_ENABLED", "true").lower() != "false"
    sync_interval_seconds: int = int(os.getenv("MOLIZHISHU_SYNC_INTERVAL_SECONDS", "60"))
    sync_limit: int = int(os.getenv("MOLIZHISHU_SYNC_LIMIT", "20"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
