from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
async def health():
    """Return service health for Docker and deployment checks."""
    return {"success": True, "data": {"service": "molizhishu-api-pub-python", "status": "ok"}}
