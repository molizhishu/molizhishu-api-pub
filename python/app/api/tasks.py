from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from ..config import Settings, get_settings
from ..dependencies import get_client, get_repo
from ..molizhishu_client import MolizhishuClient
from ..repository import TaskRepository
from ..syncer import sync_one

router = APIRouter(prefix="/api/tasks")


@router.post("")
async def create_task(
    payload: dict[str, Any],
    repo: TaskRepository = Depends(get_repo),
    client: MolizhishuClient = Depends(get_client),
    settings: Settings = Depends(get_settings),
):
    """Submit a Molizhishu task and persist the initial local snapshot."""
    validate_submit_payload(payload)
    if not payload.get("callbackUrl") and settings.callback_url:
        payload["callbackUrl"] = settings.callback_url
    data = await client.submit_task(payload)
    repo.save_submitted_task(payload, data)
    return {"success": True, "data": data}


@router.get("")
async def list_tasks(page: int = 1, size: int = 20, status: str | None = None, repo: TaskRepository = Depends(get_repo)):
    """List local tasks without calling Molizhishu remote APIs."""
    return {"success": True, "data": repo.list_tasks(max(page, 1), min(max(size, 1), 100), status)}


@router.get("/{task_id}")
async def get_task(task_id: str, repo: TaskRepository = Depends(get_repo)):
    """Return one local task with subtasks and recent callback events."""
    task = repo.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"success": True, "data": task}


@router.post("/{task_id}/sync")
async def sync_task(task_id: str, repo: TaskRepository = Depends(get_repo), client: MolizhishuClient = Depends(get_client)):
    """Run manual compensation sync for one task."""
    return {"success": True, "data": await sync_one(task_id, client, repo, "local-api:manual-compensation")}


@router.put("/{task_id}/stop")
async def stop_task(task_id: str, client: MolizhishuClient = Depends(get_client)):
    """Stop an unfinished Molizhishu task."""
    return {"success": True, "data": {"message": await client.stop_task(task_id)}}


def validate_submit_payload(payload: dict[str, Any]) -> None:
    prompts = payload.get("prompts")
    if not isinstance(prompts, list) or not prompts:
        raise HTTPException(status_code=422, detail="prompts 必须是非空数组")
    if len(prompts) > 50:
        raise HTTPException(status_code=422, detail="prompts 最多 50 个")
    platforms = payload.get("platforms")
    if not isinstance(platforms, list) or not platforms:
        raise HTTPException(status_code=422, detail="platforms 必须是非空数组")
    for platform in platforms:
        if not isinstance(platform, dict) or not platform.get("platform") or not platform.get("mode"):
            raise HTTPException(status_code=422, detail="platforms 每一项必须包含 platform 和 mode")
