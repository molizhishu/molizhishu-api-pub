from typing import Any

import bcrypt
from fastapi import Request


def bearer_token(request: Request) -> str:
    """Extract a Bearer token from the Authorization header."""
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return ""
    return header[7:].strip()


def verify_password(password_hash: str, password: str) -> bool:
    """Verify bcrypt password hashes, including legacy `$2y$` hashes from PHP."""
    normalized = password_hash.replace("$2y$", "$2b$", 1)
    return bcrypt.checkpw(password.encode("utf-8"), normalized.encode("utf-8"))


def mask(value: str) -> dict[str, Any]:
    """Return a frontend-safe API key mask without exposing the real token."""
    token = value.strip()
    if not token:
        return {"configured": False, "masked": None, "last4": None}
    last4 = token[-4:]
    return {"configured": True, "masked": "*" * max(8, len(token) - 4) + last4, "last4": last4}
