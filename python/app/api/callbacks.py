from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_client, get_repo
from ..molizhishu_client import MolizhishuClient
from ..repository import TaskRepository

router = APIRouter()


@router.post("/webhooks/molizhishu")
async def callback(payload: dict[str, Any], repo: TaskRepository = Depends(get_repo)):
    """Receive and idempotently persist Molizhishu callback payloads."""
    if not payload.get("taskId") or not payload.get("status"):
        raise HTTPException(status_code=400, detail="taskId 和 status 必填")
    duplicate = repo.save_callback(payload)
    return {"success": True, "data": {"duplicate": duplicate}}


@router.get("/api/callback-url")
async def get_callback_url(client: MolizhishuClient = Depends(get_client)):
    """Read the global Molizhishu callback URL."""
    return {"success": True, "data": await client.get_callback_url()}


@router.put("/api/callback-url")
async def update_callback_url(payload: dict[str, Any], client: MolizhishuClient = Depends(get_client)):
    """Update or clear the global Molizhishu callback URL."""
    return {"success": True, "data": await client.update_callback_url(payload.get("callbackUrl"))}


@router.get("/api/cities")
async def cities(client: MolizhishuClient = Depends(get_client)):
    """Proxy Molizhishu city/region metadata for the shared frontend."""
    return {"success": True, "data": await client.get_cities()}
