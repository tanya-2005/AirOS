from fastapi import APIRouter, Depends, HTTPException, Header

from .. import auth
from ..schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest):
    # TEMPORARY DEBUG — remove once the exact failing step is identified.
    # print(), not logging, so it shows up in Render's log stream with no
    # config needed; flush=True so it's not lost if the dyno is killed
    # right after this request.
    print("=== LOGIN DEBUG ===", flush=True)
    print(f"payload.email      = {payload.email}", flush=True)
    print(f"repr(payload.email)= {payload.email!r}", flush=True)
    print(f"payload.password      = {payload.password}", flush=True)
    print(f"repr(payload.password)= {payload.password!r}", flush=True)
    user = auth.find_user_by_email(payload.email)
    print(f"find_user_by_email() found = {user is not None}", flush=True)
    if user:
        print(f"matched user email = {user['email']!r}", flush=True)
    pw_ok = user is not None and auth.verify_password(payload.password.strip(), user["password_salt"], user["password_hash"])
    print(f"verify_password() result = {pw_ok}", flush=True)
    print("=== END LOGIN DEBUG ===", flush=True)

    # find_user_by_email already strips the email; verify_password never
    # stripped the password, so a stray trailing space picked up by a
    # manually-typed or copy-pasted credential (the frontend fixes this at
    # the source too) silently 401'd here with a byte-identical-looking
    # payload. Trim server-side as well so any client gets the same fix.
    if not user or not pw_ok:
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
