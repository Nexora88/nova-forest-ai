# =====================================
# NOVA-FOREST AI
# Main Application
# Version 0.5
# =====================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.risk_routes import router as risk_router
from app.api.satellite_routes import router as satellite_router


app = FastAPI(
    title="Nova-Forest AI",
    description=(
        "Uydu tabanlı çevresel risk "
        "analiz ve karar destek platformu."
    ),
    version="0.5.0"
)


# =====================================
# CORS
# =====================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# =====================================
# API ROUTES
# =====================================

app.include_router(
    risk_router
)

app.include_router(
    satellite_router
)


# =====================================
# ROOT
# =====================================

@app.get("/")
def root():

    return {

        "system": "Nova-Forest AI",

        "status": "online",

        "version": "0.5.0",

        "services": {

            "risk_analysis": "online",

            "weather_data": "online",

            "satellite_monitor":
                "online"

        }

    }


# =====================================
# HEALTH
# =====================================

@app.get("/health")
def health():

    return {

        "status": "healthy",

        "system":
            "Nova-Forest AI"

    }
