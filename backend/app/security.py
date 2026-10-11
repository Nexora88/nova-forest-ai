"""Defense-in-depth request protections for the public API.

The in-process limiter is a burst guard, not a replacement for a shared
rate-limit store or the hosting provider's WAF. Serverless instances do not
share this memory; keep expensive work authenticated and quota-gated.
"""
import os
import time
from collections import OrderedDict, deque

from fastapi import Request
from starlette.responses import JSONResponse

MAX_BYTES = int(os.getenv("MAX_REQUEST_BYTES", "1048576"))
WINDOW = 60
DEFAULT_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
EXPENSIVE_LIMIT = int(os.getenv("EXPENSIVE_RATE_LIMIT_PER_MINUTE", "12"))
MAX_TRACKED_CLIENTS = 10000
_hits: OrderedDict[tuple[str, str], deque] = OrderedDict()


def client_key(request: Request) -> str:
    # On Vercel, forwarded addresses are appended by the proxy. Use the
    # right-most address to avoid trusting a client-supplied left-most value.
    # Configure a shared limiter/WAF at the edge for production-grade controls.
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded.strip():
        ip = forwarded.split(",")[-1].strip()
        if ip:
            return ip[:128]
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip[:128]
    return request.client.host if request.client else "unknown"


def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    return response


def _limit_for_path(path: str) -> int:
    expensive_prefixes = (
        "/jobs/",
        "/enterprise/reports",
        "/ndvi/area-timeseries",
        "/ndvi/risk-raster",
        "/satellite/live-check",
        "/satellite/providers/status",
    )
    return EXPENSIVE_LIMIT if any(path.startswith(p) for p in expensive_prefixes) else DEFAULT_LIMIT


async def security_middleware(request: Request, call_next):
    cl = request.headers.get("content-length")
    if cl:
        try:
            body_size = int(cl)
        except ValueError:
            return security_headers(JSONResponse({"detail": "invalid_content_length"}, status_code=400))
        if body_size < 0 or body_size > MAX_BYTES:
            return security_headers(JSONResponse({"detail": "request_too_large"}, status_code=413))

    now = time.monotonic()
    client = client_key(request)
    bucket_key = (client, request.url.path)
    q = _hits.get(bucket_key)
    if q is None:
        q = deque()
        _hits[bucket_key] = q
    _hits.move_to_end(bucket_key)
    while q and now - q[0] >= WINDOW:
        q.popleft()

    limit = _limit_for_path(request.url.path)
    if len(q) >= limit:
        return security_headers(
            JSONResponse(
                {"detail": "rate_limited", "retry_after": WINDOW},
                status_code=429,
                headers={"Retry-After": str(WINDOW)},
            )
        )

    q.append(now)
    # Bound memory if a burst of distinct addresses reaches this process.
    while len(_hits) > MAX_TRACKED_CLIENTS:
        _hits.popitem(last=False)

    try:
        response = await call_next(request)
    except Exception:
        # Do not leak internal exception details through the security layer.
        raise
    return security_headers(response)
