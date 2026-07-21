// Base fetch client for the FastAPI backend (see backend/main.py).
// Every page's data hook goes through here so there is exactly one place
// that knows the base URL, timeout, error shape, and — since Phase 8 —
// auth token attachment.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

const TOKEN_STORAGE_KEY = "airos_token";

// Plain module-level storage, not React state: apiFetch is a bare function
// called from outside any component (react-query queryFns), so it can't
// read context. lib/auth/AuthContext.jsx is the single writer of this value
// (via setToken/clearToken) and mirrors it into localStorage so a page
// refresh doesn't lose the session.
export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// AuthContext registers itself here on mount so apiFetch can trigger a
// clean logout the moment any request comes back 401 (expired/invalid
// session) — otherwise every page would just show a generic "couldn't
// reach the backend" error instead of returning the user to Login.
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// FastAPI's `detail` is a plain string for a handler's own HTTPException
// (e.g. "Invalid email or password") but an ARRAY of Pydantic validation
// error objects ({loc, msg, type}) for a 422 request-shape failure. Without
// this, a 422's detail would render as "[object Object]" instead of a
// readable message — a real bug, not just a nicety.
function describeDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : null;
        return field ? `${field}: ${e.msg}` : e.msg;
      })
      .join("; ");
  }
  return null;
}

export async function apiFetch(path, { method = "GET", body, signal } = {}) {
  const token = getToken();
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    throw new ApiError(`Network error reaching ${path}: ${err.message}`, 0, null);
  }

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token) {
      // The token we sent was rejected (expired/invalid) — clear it and
      // let AuthContext redirect to Login, rather than every hook on the
      // page independently surfacing a raw error.
      unauthorizedHandler?.();
    }
    const message =
      (payload && typeof payload === "object" && describeDetail(payload.detail)) ||
      `Request to ${path} failed with ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }

  return payload;
}

/** Friendlier framing for user-facing forms (Login, etc.) — same message for the cases apiFetch already describes well (401 "Invalid email or password", 403, 404...), a clearer one for the two cases that read badly verbatim: unreachable backend and validation failures. */
export function describeApiError(err) {
  if (!(err instanceof ApiError)) return "Something went wrong. Please try again.";
  if (err.status === 0) return "Can't reach the AirOS backend. Check that it's running, then try again.";
  return err.message;
}
