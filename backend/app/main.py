from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.risk_routes import router as risk_router
from app.api.satellite_routes import router as satellite_router
from app.api.weather_routes import router as weather_router
from app.api.advanced_risk_routes import router as advanced_router

app = FastAPI(
    title="Nova-Forest AI",
    description="Uydu tabanlı çevresel risk analiz ve karar destek platformu.",
    version="1.0.0",
)

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

@app.get("/")
def root():
    return {
        "system": "Nova-Forest AI",
        "status": "online",
        "version": "1.0.0",
        "services": {
            "risk_analysis": "online",
            "weather_data": "online",
            "satellite_monitor": "online",
            "firms_monitor": "configured_if_key_present",
        },
    }

@app.get("/health")
def health():
    return {"status": "healthy", "system": "Nova-Forest AI", "version": "1.0.0"}
