from fastapi import APIRouter

from app.routes.market import router as market_router
from app.routes.weather import router as weather_router

api_router = APIRouter()
api_router.include_router(market_router)
api_router.include_router(weather_router)
