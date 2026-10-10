from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.engine.ml_fire_model import model_status, predict
from app.engine.uci_research_model import model_status as research_model_status, predict as research_predict

router = APIRouter(prefix="/ml", tags=["Predictive ML"])


class FireFeatures(BaseModel):
    temperature_max: float = Field(ge=-60, le=70)
    humidity_min: float = Field(ge=0, le=100)
    wind_max: float = Field(ge=0, le=250)
    precipitation_sum: float = Field(ge=0, le=2000)
    et0: float = Field(ge=0, le=50)
    vpd_max: float = Field(ge=0, le=20)
    precipitation_previous_6d: float = Field(ge=0, le=2000)


class ResearchFireFeatures(BaseModel):
    temperature_max: float = Field(ge=-20, le=60)
    humidity_min: float = Field(ge=0, le=100)
    wind_max: float = Field(ge=0, le=150)
    precipitation_sum: float = Field(ge=0, le=500)


@router.get("/status")
def predictive_model_status():
    return model_status()


@router.post("/predict")
def predictive_fire_risk(features: FireFeatures):
    try:
        return predict(features.dict())
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"status": "model_not_ready", "message": str(exc)})
    except ImportError:
        raise HTTPException(status_code=503, detail="The ML runtime dependency is not installed.")
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/research-status")
def research_predictive_model_status():
    return research_model_status()


@router.post("/research-predict")
def research_predictive_fire_risk(features: ResearchFireFeatures):
    try:
        return research_predict(features.dict())
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"status": "model_not_ready", "message": str(exc)})
    except ImportError:
        raise HTTPException(status_code=503, detail="The ML runtime dependency is not installed.")
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
