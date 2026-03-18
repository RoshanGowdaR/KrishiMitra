from fastapi import APIRouter

from app.routes.crop_disease import router as crop_disease_router
from app.routes.market import router as market_router
from app.routes.schemes import router as schemes_router
from app.routes.weather import router as weather_router

api_router = APIRouter()
api_router.include_router(crop_disease_router)
api_router.include_router(market_router)
api_router.include_router(schemes_router)
api_router.include_router(weather_router)
