from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..config import Settings, get_settings
from ..security import mask

router = APIRouter(prefix="/api/settings")


@router.get("")
async def settings(settings: Settings = Depends(get_settings)):
    """Return frontend-safe system settings."""
    return {
        "success": True,
        "data": {
            "apiKey": mask(settings.token),
            "security": {"apiKeyUpdateAllowed": settings.allow_api_key_update},
        },
    }


@router.put("/api-key")
async def update_api_key(settings: Settings = Depends(get_settings)):
    """Reject runtime API key writes in this lightweight Python demo."""
    if not settings.allow_api_key_update:
        return JSONResponse(status_code=403, content={"success": False, "message": "当前环境禁止在页面修改 API Key"})
    return JSONResponse(status_code=403, content={"success": False, "message": "Python demo 未启用运行时写入配置，请通过服务端环境变量配置 API Key"})
