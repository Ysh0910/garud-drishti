from fastapi import APIRouter

api_router = APIRouter()

@api_router.get("/risk/{latitude}/{longitude}")
async def get_point_risk(latitude: float, longitude: float):
    return {
        "latitude": latitude,
        "longitude": longitude,
        "base_susceptibility": 45.0,
        "current_risk": 78,
        "risk_level": "HIGH",
        "risk_6h": 82,
        "risk_24h": 88,
        "risk_48h": 75,
        "risk_72h": 60,
    }
