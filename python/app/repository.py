import hashlib
import json
import secrets
from typing import Any
from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .models import AdminUser, CallbackEvent, Subtask, Task


TERMINAL_STATUSES = {"completed", "partial_completed", "failed", "stopped"}


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def save_submitted_task(self, request: dict[str, Any], response: dict[str, Any]) -> None:
        task_id = response["taskId"]
        self._upsert_task(
            {
                "task_id": task_id,
                "status": response.get("status", "pending"),
                "prompts_json": request.get("prompts") or [],
                "platforms_json": request.get("platforms") or [],
                "region_code_json": request.get("regionCode") or [],
                "callback_url": response.get("callbackUrl"),
                "total_items": response.get("totalTask") or response.get("totalItems") or 0,
                "completed_items": 0,
                "failed_items": 0,
                "poll_url": response.get("pollUrl"),
                "raw_request_json": request,
                "raw_response_json": response,
            }
        )
        self._upsert_subtasks(task_id, response.get("subTaskList") or [])
        self.db.commit()

    def save_remote_result(self, payload: dict[str, Any]) -> None:
        task_id = payload["taskId"]
        self._upsert_task(
            {
                "task_id": task_id,
                "status": payload.get("status", "processing"),
                "prompts_json": [],
                "platforms_json": [],
                "region_code_json": [],
                "callback_url": payload.get("callbackUrl"),
                "total_items": payload.get("totalItems") or 0,
                "completed_items": payload.get("completedItems") or 0,
                "failed_items": payload.get("failedItems") or 0,
                "poll_url": payload.get("pollUrl"),
                "created_at": payload.get("createdAt"),
                "completed_at": payload.get("completedAt"),
                "raw_request_json": {},
                "raw_response_json": payload,
            },
            update_fields={
                "status",
                "total_items",
                "completed_items",
                "failed_items",
                "callback_url",
                "poll_url",
                "created_at",
                "completed_at",
                "raw_response_json",
                "updated_at",
            },
        )
        self._upsert_subtasks(task_id, payload.get("subTaskList") or [])
        self._backfill_task_metadata(task_id)
        self.db.commit()

    def save_callback(self, payload: dict[str, Any]) -> bool:
        raw = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        event = CallbackEvent(
            task_id=payload["taskId"],
            payload_json=payload,
            payload_hash=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
            process_status="processed",
            processed_at=func.now(),
        )
        self.db.add(event)
        try:
            self.db.flush()
        except IntegrityError:
            self.db.rollback()
            return True
        self.save_remote_result(payload)
        return False

    def list_tasks(self, page: int, size: int, status: str | None) -> dict[str, Any]:
        query = select(Task)
        count_query = select(func.count()).select_from(Task)
        if status:
            query = query.where(Task.status == status)
            count_query = count_query.where(Task.status == status)
        items = self.db.scalars(query.order_by(Task.created_local_at.desc()).limit(size).offset((page - 1) * size)).all()
        total = self.db.scalar(count_query)
        return {"items": [self._task_to_dict(item, False) for item in items], "total": total, "page": page, "size": size}

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        task = self.db.scalar(select(Task).options(selectinload(Task.subtasks)).where(Task.task_id == task_id))
        if not task:
            return None
        data = self._task_to_dict(task, True)
        events = self.db.scalars(select(CallbackEvent).where(CallbackEvent.task_id == task_id).order_by(CallbackEvent.received_at.desc()).limit(20)).all()
        data["callbackEvents"] = [self._callback_event_to_dict(event) for event in events]
        return data

    def unfinished_task_ids(self, limit: int = 20) -> list[str]:
        rows = self.db.execute(
            select(Task.task_id)
            .outerjoin(Subtask, Subtask.task_id == Task.task_id)
            .where(
                or_(
                    Task.status.not_in(TERMINAL_STATUSES),
                    Subtask.subtask_id.is_(None),
                    Subtask.status.is_(None),
                    Subtask.status.not_in(TERMINAL_STATUSES),
                    Task.status.in_({"completed", "partial_completed"})
                    & (Subtask.status == "completed")
                    & ((Subtask.answer_content.is_(None)) | (Subtask.answer_content == "")),
                )
            )
            .group_by(Task.task_id)
            .order_by(func.min(Task.created_local_at).asc())
            .limit(max(limit, 1))
        ).all()
        return [row[0] for row in rows]

    def find_admin_by_username(self, username: str) -> AdminUser | None:
        return self.db.scalar(select(AdminUser).where(AdminUser.username == username.strip(), AdminUser.status == 1))

    def issue_token(self, user: AdminUser, ip: str | None) -> tuple[str, datetime]:
        token = secrets.token_hex(32)
        expires_at = datetime.now() + timedelta(days=7)
        user.auth_token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        user.token_expires_at = expires_at
        user.last_login_at = datetime.now()
        user.last_login_ip = ip
        self.db.commit()
        return token, expires_at

    def authenticate(self, token: str | None) -> AdminUser | None:
        if not token:
            return None
        token_hash = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
        user = self.db.scalar(select(AdminUser).where(AdminUser.auth_token_hash == token_hash, AdminUser.status == 1))
        if not user or not user.token_expires_at or user.token_expires_at < datetime.now():
            return None
        return user

    def logout(self, token: str | None) -> None:
        user = self.authenticate(token)
        if user:
            user.auth_token_hash = None
            user.token_expires_at = None
            self.db.commit()

    def _upsert_task(self, values: dict[str, Any], update_fields: set[str] | None = None) -> None:
        now = datetime.now()
        values.setdefault("created_local_at", now)
        values["updated_at"] = now
        stmt = insert(Task).values(**values)
        allowed_update_fields = update_fields or set(values.keys())
        update_values = {
            key: stmt.inserted[key]
            for key in values.keys()
            if key not in {"task_id", "created_local_at"} and key in allowed_update_fields
        }
        self.db.execute(stmt.on_duplicate_key_update(**update_values))

    def _upsert_subtasks(self, task_id: str, rows: list[dict[str, Any]]) -> None:
        for row in rows:
            subtask_id = row.get("subTaskId")
            if not subtask_id:
                continue
            values = {
                "subtask_id": subtask_id,
                "task_id": task_id,
                "platform": row.get("platform"),
                "mode": row.get("mode"),
                "prompt": row.get("prompt"),
                "status": row.get("status"),
                "time": row.get("time"),
                "page_screenshot": row.get("pageScreenshot"),
                "answer_content": row.get("answerContent"),
                "reference_list_json": row.get("referenceList") or [],
                "citation_list_json": row.get("citationList") or [],
                "reasoning_process_json": row.get("reasoningProcess") or {},
                "recommended_questions_json": row.get("recommendedQuestions") or [],
                "media_content_json": row.get("mediaContent") or [],
                "error_message": row.get("errorMessage"),
                "proxy_ip": row.get("proxyIp"),
                "raw_result_json": row,
                "updated_at": datetime.now(),
            }
            stmt = insert(Subtask).values(**values)
            update_values = {key: stmt.inserted[key] for key in values.keys() if key != "subtask_id"}
            self.db.execute(stmt.on_duplicate_key_update(**update_values))

    def _backfill_task_metadata(self, task_id: str) -> None:
        task = self.db.scalar(select(Task).where(Task.task_id == task_id))
        if not task:
            return

        subtasks = self.db.scalars(select(Subtask).where(Subtask.task_id == task_id).order_by(Subtask.updated_at.asc())).all()
        if not subtasks:
            return

        changed = False
        if not task.prompts_json:
            prompts: list[str] = []
            for subtask in subtasks:
                if subtask.prompt and subtask.prompt not in prompts:
                    prompts.append(subtask.prompt)
            if prompts:
                task.prompts_json = prompts
                changed = True

        if not task.platforms_json:
            platform_keys: set[tuple[str, str]] = set()
            platforms: list[dict[str, str]] = []
            for subtask in subtasks:
                if not subtask.platform or not subtask.mode:
                    continue
                key = (subtask.platform, subtask.mode)
                if key in platform_keys:
                    continue
                platform_keys.add(key)
                platforms.append({"platform": subtask.platform, "mode": subtask.mode})
            if platforms:
                task.platforms_json = platforms
                changed = True

        if changed:
            task.updated_at = datetime.now()

    def _task_to_dict(self, task: Task, include_subtasks: bool) -> dict[str, Any]:
        data = {column.name: getattr(task, column.name) for column in Task.__table__.columns}
        data["taskId"] = data.pop("task_id")
        data["task_id"] = data["taskId"]
        for key in ("prompts_json", "platforms_json", "region_code_json", "raw_request_json", "raw_response_json"):
            data[key] = json.dumps(data.get(key), ensure_ascii=False)
        if include_subtasks:
            data["subTaskList"] = [self._subtask_to_dict(item) for item in task.subtasks]
        return data

    def _subtask_to_dict(self, subtask: Subtask) -> dict[str, Any]:
        data = {column.name: getattr(subtask, column.name) for column in Subtask.__table__.columns}
        data["subTaskId"] = data.pop("subtask_id")
        data["subtask_id"] = data["subTaskId"]
        for key in ("reference_list_json", "citation_list_json", "reasoning_process_json", "recommended_questions_json", "media_content_json", "raw_result_json"):
            data[key] = json.dumps(data.get(key), ensure_ascii=False)
        return data

    def _callback_event_to_dict(self, event: CallbackEvent) -> dict[str, Any]:
        data = {column.name: getattr(event, column.name) for column in CallbackEvent.__table__.columns}
        data["payload_json"] = json.dumps(data.get("payload_json"), ensure_ascii=False)
        return data


def public_user(user: AdminUser) -> dict[str, Any]:
    return {"id": user.id, "username": user.username, "displayName": user.display_name, "role": user.role}
