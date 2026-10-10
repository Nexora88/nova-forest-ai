from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.api.risk_routes import router as risk_router
from app.api.satellite_routes import router as satellite_router
from app.api.weather_routes import router as weather_router
from app.api.advanced_risk_routes import router as advanced_router
from app.api.ndvi_routes import router as ndvi_router
from app.api.forecast_routes import router as forecast_router
from app.api.notification_routes import router as notification_router
from app.api.environment_routes import router as environment_router
from app.api.ml_routes import router as ml_router
from app.api.jobs_routes import router as jobs_router
from app.api.enterprise_reports import router as enterprise_reports_router
from app.engine.ml_fire_model import model_status as fire_model_status

app = FastAPI(title="NexoraWildfire AI", description="Uydu tabanlı çevresel risk analiz ve karar destek platformu.", version="1.3.1")

import os
from app.security import security_middleware

# Keep public production frontends allowed even when ALLOWED_ORIGINS is set in the hosting environment.
# Preview URLs remain excluded; add any private/custom origin explicitly through ALLOWED_ORIGINS.
DEFAULT_PUBLIC_ORIGINS = {
    "https://nexora88.github.io",
    "https://nova-forest-ai.vercel.app",
    "https://nova-forest-ai-nexora88s-projects.vercel.app",
    "https://nova-forest-ai-git-main-nexora88s-projects.vercel.app",
}
CONFIGURED_ORIGINS = {
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}
ALLOWED_ORIGINS = sorted(DEFAULT_PUBLIC_ORIGINS | CONFIGURED_ORIGINS)

# Register the security function explicitly as a dispatch middleware. This avoids
# the function being treated as a middleware class by the serverless runtime.
app.add_middleware(BaseHTTPMiddleware, dispatch=security_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["X-Nexora-Risk-Type", "X-Nexora-Weather-Risk", "X-Nexora-Weather-Time"],
)


app.include_router(risk_router)
app.include_router(satellite_router)
app.include_router(weather_router)
app.include_router(advanced_router)
app.include_router(ndvi_router)
app.include_router(forecast_router)
app.include_router(notification_router)
app.include_router(environment_router)
app.include_router(ml_router)
app.include_router(jobs_router)
app.include_router(enterprise_reports_router)


@app.middleware("http")
async def vercel_api_prefix(request, call_next):
    # Vercel exposes the FastAPI service under /api while the local app keeps
    # its clean route names. Strip the public prefix only for route matching.
    path = request.scope.get("path", "")
    if path == "/api" or path.startswith("/api/"):
        request.scope["path"] = path[4:] or "/"
        request.scope["root_path"] = "/api"
    return await call_next(request)


@app.get("/")
def root():
    model = fire_model_status()
    return {
        "system": "NexoraWildfire AI",
        "status": "api_ready",
        "version": "1.3.1",
        "upstream_data_verified": False,
        "capabilities": {
            "risk_routes": "registered",
            "weather_routes": "registered",
            "satellite_routes": "registered",
            "forecast_routes": "registered",
            "notifications": "route_registered",
            "predictive_ml": model.get("status", "unknown"),
        },
        "note": "API readiness does not mean every external provider is reachable. Check /satellite/live-check and /satellite/providers/status for provider diagnostics. Scores are decision-support indicators, not official fire warnings.",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "system": "NexoraWildfire AI", "version": "1.3.1"}
