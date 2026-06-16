from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class Task(Base):
    __tablename__ = "geo_tasks"

    task_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[str] = mapped_column(String(17))
    prompts_json: Mapped[list] = mapped_column(JSON)
    platforms_json: Mapped[list] = mapped_column(JSON)
    region_code_json: Mapped[list] = mapped_column(JSON)
    callback_url: Mapped[str | None] = mapped_column(String(512))
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    completed_items: Mapped[int] = mapped_column(Integer, default=0)
    failed_items: Mapped[int] = mapped_column(Integer, default=0)
    poll_url: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[int | None] = mapped_column(BigInteger)
    completed_at: Mapped[int | None] = mapped_column(BigInteger)
    raw_request_json: Mapped[dict] = mapped_column(JSON)
    raw_response_json: Mapped[dict | None] = mapped_column(JSON)
    last_error: Mapped[str | None] = mapped_column(Text)
    created_local_at = mapped_column(DateTime, server_default=func.now())
    updated_at = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    subtasks: Mapped[list["Subtask"]] = relationship(back_populates="task")


class Subtask(Base):
    __tablename__ = "geo_subtasks"

    subtask_id: Mapped[str] = mapped_column(String(19), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey("geo_tasks.task_id", ondelete="CASCADE"))
    platform: Mapped[str | None] = mapped_column(String(50))
    mode: Mapped[str | None] = mapped_column(String(16))
    prompt: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(10))
    time: Mapped[int | None] = mapped_column(BigInteger)
    page_screenshot: Mapped[str | None] = mapped_column(String(500))
    answer_content: Mapped[str | None] = mapped_column(Text)
    reference_list_json: Mapped[list | None] = mapped_column(JSON)
    citation_list_json: Mapped[list | None] = mapped_column(JSON)
    reasoning_process_json: Mapped[dict | None] = mapped_column(JSON)
    recommended_questions_json: Mapped[list | None] = mapped_column(JSON)
    media_content_json: Mapped[list | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
    proxy_ip: Mapped[str | None] = mapped_column(String(45))
    raw_result_json: Mapped[dict | None] = mapped_column(JSON)
    updated_at = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    task: Mapped[Task] = relationship(back_populates="subtasks")


class CallbackEvent(Base):
    __tablename__ = "geo_callback_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(36))
    payload_json: Mapped[dict] = mapped_column(JSON)
    payload_hash: Mapped[str] = mapped_column(String(64))
    process_status: Mapped[str] = mapped_column(String(20))
    error_message: Mapped[str | None] = mapped_column(Text)
    received_at = mapped_column(DateTime, server_default=func.now())
    processed_at = mapped_column(DateTime)


class AdminUser(Base):
    __tablename__ = "geo_admin_users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64))
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(40))
    status: Mapped[int] = mapped_column(Integer)
    auth_token_hash: Mapped[str | None] = mapped_column(String(64))
    token_expires_at = mapped_column(DateTime)
    last_login_at = mapped_column(DateTime)
    last_login_ip: Mapped[str | None] = mapped_column(String(45))
