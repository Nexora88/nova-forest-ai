# =====================================
# NOVA-FOREST AI
# Main Application
# =====================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.risk_routes import router as risk_router


app = FastAPI(
    title="Nova-Forest AI",
    description="Uydu tabanlı çevresel risk analiz platformu",
    version="0.4.0"
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


# =====================================
# SYSTEM STATUS
# =====================================

@app.get("/")
def root():

    return {

        "system": "Nova-Forest AI",

        "status": "online",

        "version": "0.4.0",

        "message":
        "Environmental Risk Analysis API"

    }


@app.get("/health")
def health():

    return {

        "status": "healthy",

        "system":
        "Nova-Forest AI"

    }
