from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.daily_briefing_service import get_daily_briefing

router = APIRouter(tags=["Daily Briefing"])


class DailyNewsItem(BaseModel):
    title: str
    summary: str
    why_it_matters: str
    details: str


class DailyBriefingResponse(BaseModel):
    quote: str
    news: list[DailyNewsItem]
    date: str
    generated_at: str
    source: str


@router.get("/daily-briefing", response_model=DailyBriefingResponse)
async def read_daily_briefing(
    force_refresh: bool = Query(False, description="Force regeneration from Groq"),
    language: str = Query("en", min_length=2, max_length=5, description="Target language code"),
) -> DailyBriefingResponse:
    payload = await get_daily_briefing(force_refresh=force_refresh, language=language)
    return DailyBriefingResponse(**payload)
