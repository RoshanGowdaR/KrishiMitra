from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.soil_service import (
    SUPPORTED_CROPS,
    analyze_soil_by_appearance,
    analyze_soil_by_location,
    analyze_soil_card,
    calculate_input_cost,
    get_crop_soil_requirements,
    get_soil_card_guidance,
)

router = APIRouter(tags=["Soil"])


class Micronutrients(BaseModel):
    zinc: float = Field(..., ge=0)
    boron: float = Field(..., ge=0)
    iron: float = Field(..., ge=0)


class SoilCardRequest(BaseModel):
    pH: float = Field(..., ge=0, le=14)
    nitrogen: float = Field(..., ge=0)
    phosphorus: float = Field(..., ge=0)
    potassium: float = Field(..., ge=0)
    organic_carbon: float = Field(..., ge=0)
    micronutrients: Micronutrients


class FertilizerRecommendation(BaseModel):
    type: str
    quantity: str


class SoilCardResponse(BaseModel):
    soil_health_status: Literal["poor", "moderate", "good", "excellent"]
    crop_recommendations: list[str]
    fertilizer_recommendations: list[FertilizerRecommendation]


class SoilAppearanceRequest(BaseModel):
    soil_color: Literal["red", "black", "brown", "sandy"]
    water_drainage: Literal["fast", "moderate", "slow"]
    previous_crops: list[str] = Field(default_factory=list)
    state: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)


class SoilAppearanceResponse(BaseModel):
    estimated_soil_type: str
    estimated_soil_health: Literal["poor", "moderate", "good", "excellent"]
    crop_recommendations: list[str]
    confidence_level: Literal["low", "medium", "high"]


class LocationResponse(BaseModel):
    state: str
    district: str
    typical_soil_type: str
    crops: list[str]
    fertilizer_recommendations: list[FertilizerRecommendation]
    note: str


class SoilCardGuidanceResponse(BaseModel):
    steps: list[str]
    required_documents: list[str]
    helpline_numbers: list[str]


class CostCalculatorRequest(BaseModel):
    crop: str
    area_acres: float
    soil_health: str = Field(default="moderate")


class CostRange(BaseModel):
    min_kg: float | None = None
    max_kg: float | None = None
    min_inr: float | None = None
    max_inr: float | None = None


class CostCalculatorResponse(BaseModel):
    crop: str
    area_acres: float
    soil_health: str
    seeds_cost: float
    fertilizer_cost: float
    pesticide_cost: float
    irrigation_cost: float
    labor_cost: float
    total_cost: float
    expected_yield_range: CostRange
    expected_profit_range: CostRange


class CropRequirementResponse(BaseModel):
    crop: str
    ideal_ph: str
    soil_types: list[str]
    drainage: str
    notes: str


class SupportedCropsResponse(BaseModel):
    crops: list[str]


@router.post("/soil/analyze-card", response_model=SoilCardResponse)
async def analyze_soil_card_route(payload: SoilCardRequest) -> SoilCardResponse:
    data = payload.model_dump()
    data["pH"] = data.pop("pH")
    result = await analyze_soil_card(data)
    return SoilCardResponse(**result)


@router.post("/soil/analyze-appearance", response_model=SoilAppearanceResponse)
async def analyze_soil_by_appearance_route(
    payload: SoilAppearanceRequest,
) -> SoilAppearanceResponse:
    result = await analyze_soil_by_appearance(payload.model_dump())
    return SoilAppearanceResponse(**result)


@router.get("/soil/analyze-location", response_model=LocationResponse)
async def analyze_soil_by_location_route(
    state: str = Query(..., min_length=2),
    district: str = Query(..., min_length=2),
) -> LocationResponse:
    result = await analyze_soil_by_location(state=state, district=district)
    return LocationResponse(**result)


@router.get("/soil/card-guidance", response_model=SoilCardGuidanceResponse)
async def get_soil_card_guidance_route(
    state: str | None = Query(default=None),
) -> SoilCardGuidanceResponse:
    result = await get_soil_card_guidance(state=state)
    return SoilCardGuidanceResponse(**result)


@router.post("/soil/cost-calculator", response_model=CostCalculatorResponse)
async def calculate_input_cost_route(payload: CostCalculatorRequest) -> CostCalculatorResponse:
    if payload.area_acres < 0:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail="Area acres must be greater than zero")

    result = await calculate_input_cost(
        crop=payload.crop,
        area_acres=payload.area_acres,
        soil_health=payload.soil_health,
    )
    return CostCalculatorResponse(**result)


@router.get("/soil/crop-requirements/{crop}", response_model=CropRequirementResponse)
async def get_crop_soil_requirements_route(crop: str) -> CropRequirementResponse:
    result = await get_crop_soil_requirements(crop)
    return CropRequirementResponse(**result)


@router.get("/soil/supported-crops", response_model=SupportedCropsResponse)
async def get_supported_crops_route() -> SupportedCropsResponse:
    return SupportedCropsResponse(crops=SUPPORTED_CROPS)
