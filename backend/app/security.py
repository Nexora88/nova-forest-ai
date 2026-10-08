import os,time
from collections import defaultdict,deque
from fastapi import Request
from starlette.responses import JSONResponse

MAX_BYTES=int(os.getenv("MAX_REQUEST_BYTES","1048576"))
WINDOW=60
LIMIT=120
_hits=defaultdict(deque)

def client_key(request:Request):
    return request.headers.get("x-forwarded-for",request.client.host if request.client else "unknown").split(",")[0].strip()

def security_headers(response):
    response.headers["X-Content-Type-Options"]="nosniff"
    response.headers["X-Frame-Options"]="DENY"
    response.headers["Referrer-Policy"]="strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"]="camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Resource-Policy"]="cross-origin"
    return response

async def security_middleware(request:Request,call_next):
    cl=request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl)>MAX_BYTES:
        return security_headers(JSONResponse({"detail":"request_too_large"},status_code=413))
    key=client_key(request); now=time.monotonic(); q=_hits[key]
    while q and now-q[0]>WINDOW:q.popleft()
    # Keep this deliberately conservative: public GET data remains available, while abusive bursts are slowed.
    if len(q)>=LIMIT:
        return security_headers(JSONResponse({"detail":"rate_limited","retry_after":WINDOW},status_code=429,headers={"Retry-After":str(WINDOW)}))
    q.append(now)
    response=await call_next(request)
    return security_headers(response)
