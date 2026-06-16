from fastapi import Depends
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .database import get_db
from .molizhishu_client import MolizhishuClient
from .repository import TaskRepository


def get_client(settings: Settings = Depends(get_settings)) -> MolizhishuClient:
    """Create a Molizhishu API client from request-scoped settings."""
    return MolizhishuClient(settings)


def get_repo(db: Session = Depends(get_db)) -> TaskRepository:
    """Create the repository wrapper for the current database session."""
    return TaskRepository(db)
