from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from ..dependencies import get_repo
from ..repository import TaskRepository, public_user
from ..security import bearer_token, verify_password

router = APIRouter(prefix="/api/auth")


@router.post("/login")
async def login(payload: dict[str, Any], request: Request, repo: TaskRepository = Depends(get_repo)):
    """Authenticate an admin user and issue a frontend Bearer token."""
    user = repo.find_admin_by_username(str(payload.get("username") or ""))
    password = str(payload.get("password") or "")
    if not user or not password or not verify_password(user.password_hash, password):
        return JSONResponse(status_code=401, content={"success": False, "message": "账号或密码不正确"})
    token, expires_at = repo.issue_token(user, request.client.host if request.client else None)
    return {"success": True, "data": {"token": token, "expiresAt": expires_at.strftime("%Y-%m-%d %H:%M:%S"), "user": public_user(user)}}


@router.get("/me")
async def me(request: Request, repo: TaskRepository = Depends(get_repo)):
    """Return the current logged-in admin user."""
    user = repo.authenticate(bearer_token(request))
    if not user:
        return JSONResponse(status_code=401, content={"success": False, "message": "登录已失效"})
    return {"success": True, "data": public_user(user)}


@router.post("/logout")
async def logout(request: Request, repo: TaskRepository = Depends(get_repo)):
    """Invalidate the current admin token."""
    repo.logout(bearer_token(request))
    return {"success": True, "data": True}
