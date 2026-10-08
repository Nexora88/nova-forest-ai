from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.risk_routes import router as risk_router
from app.api.satellite_routes import router as satellite_router
from app.api.weather_routes import router as weather_router
from app.api.advanced_risk_routes import router as advanced_router
from app.api.ndvi_routes import router as ndvi_router
from app.api.forecast_routes import router as forecast_router
from app.api.notification_routes import router as notification_router

app = FastAPI(title="NexoraWildfire AI", description="Uydu tabanlı çevresel risk analiz ve karar destek platformu.", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Nexora-Risk-Type","X-Nexora-Weather-Risk","X-Nexora-Weather-Time"],
)

app.include_router(risk_router)
app.include_router(satellite_router)
app.include_router(weather_router)
app.include_router(advanced_router)
app.include_router(ndvi_router)
app.include_router(forecast_router)
app.include_router(notification_router)

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
    return {"system": "NexoraWildfire AI", "status": "online", "version": "1.2.0", "services": {"risk": "online", "weather": "online", "satellite": "online", "sentinel2_catalog": "online", "forecast_risk": "online", "notifications": "ready"}}

@app.get("/health")
def health():
    return {"status": "healthy", "system": "NexoraWildfire AI", "version": "1.2.0"}
