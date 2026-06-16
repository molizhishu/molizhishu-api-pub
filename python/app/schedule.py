import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI

from .config import get_settings
from .syncer import sync_unfinished

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Attach the FastAPI background scheduler to application lifespan.

    APScheduler owns the periodic trigger, while ``syncer`` owns API/database
    synchronization rules. ``max_instances=1`` avoids overlapping sync passes.
    """
    settings = get_settings()
    scheduler = AsyncIOScheduler(timezone=timezone.utc)
    app.state.sync_scheduler = scheduler

    if settings.sync_enabled:
        interval = max(settings.sync_interval_seconds, 1)
        scheduler.add_job(
            sync_unfinished,
            trigger=IntervalTrigger(seconds=interval),
            args=[settings, "python-scheduled-sync"],
            id="molizhishu-task-sync",
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(timezone.utc),
        )
        scheduler.start()
        logger.info("[sync] background sync started interval=%ss limit=%s", interval, settings.sync_limit)
    else:
        logger.info("[sync] background sync disabled")

    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
