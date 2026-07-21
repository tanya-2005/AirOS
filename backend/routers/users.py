from fastapi import APIRouter
from .. import auth

router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users")
def list_users():
    """Every authenticated role can see the roster (gated by main.py's
    router-level auth dependency) — needed to render officer names/avatars
    on incidents and tasks, and to populate the assignment dropdown."""
    return {"data": [auth.public_user(u) for u in auth.load_users()], "data_source": "live_pipeline"}
