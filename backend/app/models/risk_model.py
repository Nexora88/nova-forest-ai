from pydantic import BaseModel


class RiskData(BaseModel):
    region: str
    district: str

    temperature: float
    humidity: float
    wind_speed: float

    risk_score: int | None = None
    risk_level: str | None = None
