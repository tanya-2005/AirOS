"""
Authentication core — password hashing, session tokens, and the FastAPI
dependency every protected router uses.

Deliberately stdlib-only (hashlib's PBKDF2 + secrets), same "no new heavy
dependency unless it earns its place" standard as the rest of this project
(requirements.txt is still just fastapi/uvicorn/pydantic). Not a toy scheme
either: real salted PBKDF2-HMAC-SHA256 (100k iterations, matches OWASP's
current minimum), real random opaque bearer tokens, real 401s when a
request has none — this is genuine authentication, not a UI-only gate that
the API itself ignores.

Sessions are a plain JSON dict, same "no database" approach incidents.json
already uses (see incident_store.py's docstring) — persisted so a backend
restart during development doesn't force every open browser tab to log
back in.
"""
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException

_USERS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "users.json")
_SESSIONS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sessions.json")

PBKDF2_ITERATIONS = 100_000


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS).hex()
    return digest, salt


def verify_password(password, salt, expected_hash):
    digest, _ = hash_password(password, salt)
    return hmac.compare_digest(digest, expected_hash)


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---- users ----

def load_users():
    if not os.path.exists(_USERS_PATH):
        return []
    with open(_USERS_PATH) as f:
        return json.load(f)


def find_user_by_email(email):
    email = email.strip().lower()
    return next((u for u in load_users() if u["email"].lower() == email), None)


def find_user_by_id(user_id):
    return next((u for u in load_users() if u["id"] == user_id), None)


def public_user(user):
    """Strips password_hash/password_salt before this ever reaches a response."""
    if user is None:
        return None
    return {k: v for k, v in user.items() if k not in ("password_hash", "password_salt")}


# ---- sessions ----

def _load_sessions():
    if not os.path.exists(_SESSIONS_PATH):
        return {}
    with open(_SESSIONS_PATH) as f:
        return json.load(f)


def _save_sessions(sessions):
    with open(_SESSIONS_PATH, "w") as f:
        json.dump(sessions, f, indent=2)


def create_session(user_id):
    token = secrets.token_urlsafe(32)
    sessions = _load_sessions()
    sessions[token] = {"user_id": user_id, "created_at": _now_iso()}
    _save_sessions(sessions)
    return token


def delete_session(token):
    sessions = _load_sessions()
    if token in sessions:
        del sessions[token]
        _save_sessions(sessions)


def user_id_for_token(token):
    return _load_sessions().get(token, {}).get("user_id")


# ---- FastAPI dependencies ----

def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    user_id = user_id_for_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles):
    """Dependency factory — e.g. Depends(require_roles("Administrator"))."""
    def _dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {' or '.join(roles)}")
        return user
    return _dep
