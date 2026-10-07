from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.risk_routes import router as risk_router
from app.api.satellite_routes import router as satellite_router
from app.api.weather_routes import router as weather_router
from app.api.advanced_risk_routes import router as advanced_router
from app.api.ndvi_routes import router as ndvi_router
from app.api.forecast_routes import router as forecast_router
from app.api.notification_routes import router as notification_router

app = FastAPI(title="NexoraWildfire", description="Uydu tabanlı çevresel risk analiz ve karar destek platformu.", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(risk_router)
app.include_router(satellite_router)
app.include_router(weather_router)
app.include_router(advanced_router)
app.include_router(ndvi_router)
app.include_router(forecast_router)
app.include_router(notification_router)

@app.get("/")
def root():
    return {"system": "NexoraWildfire", "status": "online", "version": "1.2.0", "services": {"risk": "online", "weather": "online", "satellite": "online", "sentinel2_catalog": "online", "forecast_risk": "online", "notifications": "ready"}}

@app.get("/health")
def health():
    return {"status": "healthy", "system": "NexoraWildfire", "version": "1.2.0"}
