from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .api import auth, callbacks, health, settings, tasks
from .database import get_db
from .molizhishu_client import MolizhishuApiError
from .repository import TaskRepository
from .schedule import lifespan
from .security import bearer_token

app = FastAPI(title="molizhishu-api-pub-python", lifespan=lifespan)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(callbacks.router)
app.include_router(settings.router)


@app.exception_handler(MolizhishuApiError)
async def molizhishu_exception_handler(_: Request, exc: MolizhishuApiError):
    """Convert Molizhishu client errors into the shared frontend envelope."""
    status = exc.http_status if exc.http_status >= 400 else 502
    return JSONResponse(status_code=status, content={"success": False, "code": exc.code, "message": str(exc)})


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Protect local APIs while keeping health, login, and callback public."""
    public_paths = {"/api/health", "/api/auth/login", "/webhooks/molizhishu"}
    if request.url.path.startswith("/api/") and request.url.path not in public_paths:
        db = next(get_db())
        try:
            repo = TaskRepository(db)
            if not repo.authenticate(bearer_token(request)):
                return JSONResponse(status_code=401, content={"success": False, "message": "请先登录"})
        finally:
            db.close()
    return await call_next(request)
