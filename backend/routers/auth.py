from fastapi import APIRouter, Depends, HTTPException, Header

from .. import auth
from ..schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest):
    user = auth.find_user_by_email(payload.email)
    if not user or not auth.verify_password(payload.password, user["password_salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_session(user["id"])
    return {"token": token, "user": auth.public_user(user)}


@router.post("/logout")
def logout(authorization: str | None = Header(default=None), user=Depends(auth.get_current_user)):
    token = authorization.removeprefix("Bearer ").strip()
    auth.delete_session(token)
    return {"ok": True}


@router.get("/me")
def me(user=Depends(auth.get_current_user)):
    return {"user": auth.public_user(user)}
