from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.farm_guide_service import (
    get_all_crops,
    get_crop_comparison,
    get_crop_guide,
    get_quick_tips,
    get_seasonal_calendar,
)

router = APIRouter(tags=["Farm Guide"])


class CropListItem(BaseModel):
    name: str
    local_names: list[str]
    category: str
    season: str
    states: list[str]
    difficulty: Literal["easy", "medium", "hard"]
    profit_potential: str
    water_requirement: str
    image_description: str


class CropListResponse(BaseModel):
    crops: list[CropListItem]


class CropGuideSectionOverview(BaseModel):
    description: str
    origin: str
    climate: str
    season: str


class GenericSection(BaseModel):
    type: str | None = None
    pH: str | None = None
    drainage: str | None = None
    preparation: str | None = None
    seed_rate: str | None = None
    spacing: str | None = None
    depth: str | None = None
    method: str | None = None
    frequency: str | None = None
    critical_stages: str | None = None
    water_need: str | None = None
    base_dose: str | None = None
    top_dress: str | None = None
    micronutrients: str | None = None
    schedule: str | None = None


class PestSection(BaseModel):
    common_pests: list[str]
    symptoms: list[str]
    treatment: list[str]
    prevention: list[str]


class DiseaseSection(BaseModel):
    common_diseases: list[str]
    symptoms: list[str]
    treatment: list[str]


class HarvestSection(BaseModel):
    maturity_days: str
    indicators: str
    method: str
    yield_per_acre: str


class PostHarvestSection(BaseModel):
    storage: str
    processing: str
    shelf_life: str


class MarketInfoSection(BaseModel):
    best_selling_months: list[str]
    price_range: str
    major_markets: list[str]


class CropGuideResponse(BaseModel):
    name: str
    local_names: list[str]
    category: str
    season: str
    states: list[str]
    difficulty: str
    profit_potential: str
    water_requirement: str
    image_description: str
    overview: CropGuideSectionOverview
    soil_requirements: GenericSection
    planting: GenericSection
    irrigation: GenericSection
    fertilization: GenericSection
    pest_management: PestSection
    disease_management: DiseaseSection
    harvesting: HarvestSection
    post_harvest: PostHarvestSection
    market_info: MarketInfoSection


class SeasonalCalendarResponse(BaseModel):
    state: str
    month: int
    crops_to_sow: list[str]
    crops_to_harvest: list[str]
    important_activities: list[str]
    weather_advisory: str


class CropComparisonItem(BaseModel):
    name: str
    season: str
    difficulty: str
    profit_potential: str
    water_requirement: str
    yield_per_acre: str


class CropComparisonResponse(BaseModel):
    crop1: CropComparisonItem
    crop2: CropComparisonItem


class QuickTipsResponse(BaseModel):
    crop: str
    tips: list[str]


@router.get("/farm-guide/crops", response_model=CropListResponse)
async def read_all_crops(
    language: str = Query(default="en", min_length=2, max_length=5),
    category: str | None = Query(default=None),
) -> CropListResponse:
    crops = await get_all_crops(language=language, category=category)
    return CropListResponse(crops=[CropListItem(**item) for item in crops])


@router.get("/farm-guide/crops/{crop_name}", response_model=CropGuideResponse)
async def read_crop_guide(
    crop_name: str,
    language: str = Query(default="en", min_length=2, max_length=5),
) -> CropGuideResponse:
    guide = await get_crop_guide(crop_name=crop_name, language=language)
    return CropGuideResponse(**guide)


@router.get("/farm-guide/seasonal-calendar", response_model=SeasonalCalendarResponse)
async def read_seasonal_calendar(
    state: str = Query(..., min_length=2),
    month: int = Query(..., ge=1, le=12),
) -> SeasonalCalendarResponse:
    calendar = await get_seasonal_calendar(state=state, month=month)
    return SeasonalCalendarResponse(**calendar)


@router.get("/farm-guide/compare", response_model=CropComparisonResponse)
async def read_crop_comparison(
    crop1: str = Query(..., min_length=2),
    crop2: str = Query(..., min_length=2),
) -> CropComparisonResponse:
    comparison = await get_crop_comparison(crop1=crop1, crop2=crop2)
    return CropComparisonResponse(**comparison)


@router.get("/farm-guide/crops/{crop_name}/quick-tips", response_model=QuickTipsResponse)
async def read_quick_tips(
    crop_name: str,
    language: str = Query(default="en", min_length=2, max_length=5),
) -> QuickTipsResponse:
    tips = await get_quick_tips(crop_name=crop_name, language=language)
    return QuickTipsResponse(crop=crop_name.lower(), tips=tips)
