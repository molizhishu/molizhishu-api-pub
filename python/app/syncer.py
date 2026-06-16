import logging
import time
from typing import Any

from .config import Settings
from .database import SessionLocal
from .molizhishu_client import MolizhishuClient
from .repository import TERMINAL_STATUSES, TaskRepository

logger = logging.getLogger(__name__)


async def sync_one(task_id: str, client: MolizhishuClient, repo: TaskRepository, source: str) -> dict[str, Any]:
    """Synchronize one local task from Molizhishu status/result APIs.

    The result endpoint is fetched as soon as the master task is terminal or a
    subtask has reached a terminal state. This lets the demo persist partial
    results before every subtask has finished.
    """
    started = time.perf_counter()
    status = await client.get_task_status(task_id, f"{source}:status")
    repo.save_remote_result(status)

    fetch_result = status.get("status") in TERMINAL_STATUSES or has_completed_items(status)
    data = status
    if fetch_result:
        data = await client.get_task_result(task_id, f"{source}:result")
        repo.save_remote_result(data)

    logger.info(
        "[sync] source=%s task_id=%s status=%s fetch_result=%s duration=%sms",
        source,
        task_id,
        status.get("status", "unknown"),
        fetch_result,
        round((time.perf_counter() - started) * 1000),
    )
    return data


async def sync_unfinished(settings: Settings, source: str) -> None:
    """Synchronize one bounded batch of unfinished or incomplete local tasks."""
    with SessionLocal() as db:
        repo = TaskRepository(db)
        client = MolizhishuClient(settings)
        task_ids = repo.unfinished_task_ids(settings.sync_limit)
        synced = 0
        failed = 0
        for task_id in task_ids:
            try:
                await sync_one(task_id, client, repo, source)
                synced += 1
            except Exception as exc:
                failed += 1
                logger.exception("[sync] source=%s task_id=%s failed=true error=%r", source, task_id, str(exc))
        logger.info("[sync] source=%s total=%s synced=%s failed=%s", source, len(task_ids), synced, failed)


def has_completed_items(status: dict[str, Any]) -> bool:
    """Return true when the status payload already contains completed subtasks."""
    if int(status.get("completedItems") or 0) > 0:
        return True
    for item in status.get("subTaskList") or []:
        if isinstance(item, dict) and item.get("status") in TERMINAL_STATUSES:
            return True
    return False
