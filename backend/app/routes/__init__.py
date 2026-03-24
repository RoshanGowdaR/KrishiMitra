from fastapi import APIRouter

from app.routes.auth import router as auth_router
from app.routes.chatbot import router as chatbot_router
from app.routes.crop_disease import router as crop_disease_router
from app.routes.farm_guide import router as farm_guide_router
from app.routes.forum import router as forum_router
from app.routes.market import router as market_router
from app.routes.marketplace import router as marketplace_router
from app.routes.quiz import router as quiz_router
from app.routes.schemes import router as schemes_router
from app.routes.social import router as social_router
from app.routes.soil import router as soil_router
from app.routes.sos import router as sos_router
from app.routes.voice import router as voice_router
from app.routes.weather import router as weather_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(chatbot_router)
api_router.include_router(crop_disease_router)
api_router.include_router(farm_guide_router)
api_router.include_router(forum_router)
api_router.include_router(market_router)
api_router.include_router(marketplace_router)
api_router.include_router(quiz_router)
api_router.include_router(schemes_router)
api_router.include_router(social_router)
api_router.include_router(soil_router)
api_router.include_router(sos_router)
api_router.include_router(voice_router, tags=["Voice"])
api_router.include_router(weather_router)
