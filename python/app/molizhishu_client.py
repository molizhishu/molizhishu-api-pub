import logging
import time
from typing import Any

import httpx

from .config import Settings

logger = logging.getLogger(__name__)


class MolizhishuApiError(Exception):
    def __init__(self, message: str, code: int | None = None, http_status: int = 502):
        super().__init__(message)
        self.code = code
        self.http_status = http_status


class MolizhishuClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def submit_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/task/batch/shared", payload, "local-api:submit-task")

    async def get_task_status(self, task_id: str, source: str) -> dict[str, Any]:
        return await self._request("GET", f"/task/status/{task_id}", None, source)

    async def get_task_result(self, task_id: str, source: str) -> dict[str, Any]:
        return await self._request("GET", f"/task/result/{task_id}", None, source)

    async def stop_task(self, task_id: str) -> Any:
        return await self._request("PUT", f"/task/{task_id}/stop", None, "local-api:stop-task")

    async def get_callback_url(self) -> Any:
        return await self._request("GET", "/task/callback-url", None, "local-api:callback-url:get")

    async def update_callback_url(self, callback_url: str | None) -> Any:
        return await self._request("PUT", "/task/callback-url", {"callbackUrl": callback_url}, "local-api:callback-url:update")

    async def get_cities(self) -> Any:
        return await self._request("GET", self.settings.city_url, None, "local-api:cities", absolute=True)

    async def _request(self, method: str, path_or_url: str, payload: dict[str, Any] | None, source: str, absolute: bool = False) -> Any:
        if not self.settings.token:
            raise MolizhishuApiError("MOLIZHISHU_TOKEN 未配置", None, 0)

        url = path_or_url if absolute else self.settings.base_url.rstrip("/") + path_or_url
        started = time.perf_counter()
        headers = {"Authorization": f"Bearer {self.settings.token}", "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=self.settings.timeout_seconds) as client:
                response = await client.request(method, url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.exception("[molizhishu] source=%s method=%s url=%s http_status=0 success=false", source, method, url)
            raise MolizhishuApiError(f"模力指数接口网络异常：{exc}") from exc

        try:
            envelope = response.json()
        except ValueError as exc:
            raise MolizhishuApiError("模力指数接口返回非 JSON", None, response.status_code) from exc

        success = bool(envelope.get("success"))
        code = envelope.get("code")
        message = envelope.get("message") or ""
        logger.info(
            "[molizhishu] source=%s method=%s url=%s http_status=%s success=%s code=%s message=%r duration=%sms",
            source, method, url, response.status_code, success, code, message, round((time.perf_counter() - started) * 1000),
        )

        if response.status_code < 200 or response.status_code >= 300:
            raise MolizhishuApiError(f"模力指数 HTTP 异常：{response.status_code}", code, response.status_code)
        if not success:
            raise MolizhishuApiError(message or "模力指数业务处理失败", code, 502)
        return envelope.get("data")
