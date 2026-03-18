from typing import Any, Literal

from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field

from app.services.sos_service import (
    create_sos_request,
    get_agri_shops,
    get_expert_by_id,
    get_experts,
    get_helplines,
    get_krishi_kendras,
    get_sos_status,
    schedule_expert_callback,
)

router = APIRouter(tags=["SOS"])


class ExpertResponse(BaseModel):
    id: str
    name: str
    specialization: str
    state: str
    district: str
    phone: str
    language: str
    rating: float
    available: bool
    is_remote: bool
    experience_years: int


class ExpertsResponse(BaseModel):
    experts: list[ExpertResponse]


class SOSRequestCreate(BaseModel):
    farmer_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=8)
    state: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    issue_type: Literal[
        "crop_disease",
        "soil_health",
        "irrigation",
        "pest_control",
        "organic_farming",
        "market_advisory",
    ]
    description: str = Field(..., min_length=5)
    image_base64: str = Field(default="")
    urgency: Literal["low", "medium", "high", "critical"] = "high"


class ShopResponse(BaseModel):
    name: str
    address: str
    phone: str
    district: str
    state: str
    speciality: str


class KendraResponse(BaseModel):
    name: str
    address: str
    phone: str
    district: str
    timings: str


class SOSRequestResponse(BaseModel):
    id: str
    farmer_name: str
    phone: str
    state: str
    district: str
    issue_type: str
    description: str
    image_base64: str
    urgency: str
    status: str
    assigned_expert: ExpertResponse | dict[str, Any] | None
    fallback_level: int
    ai_response: dict[str, Any] | None
    callback_scheduled: bool
    created_at: str


class CallbackResponse(BaseModel):
    request_id: str
    callback_scheduled: bool
    message: str


class ShopsResponse(BaseModel):
    shops: list[ShopResponse]


class KendrasResponse(BaseModel):
    kendras: list[KendraResponse]


class HelplinesResponse(BaseModel):
    national: list[dict[str, str]]
    statewise: dict[str, str]


@router.get("/sos/experts", response_model=ExpertsResponse)
async def read_experts(
    state: str | None = Query(default=None),
    district: str | None = Query(default=None),
    specialization: str | None = Query(default=None),
) -> ExpertsResponse:
    experts = await get_experts(state=state, district=district, specialization=specialization)
    return ExpertsResponse(experts=[ExpertResponse(**item) for item in experts])


@router.get("/sos/experts/{expert_id}", response_model=ExpertResponse)
async def read_expert_by_id(expert_id: str) -> ExpertResponse:
    expert = await get_expert_by_id(expert_id)
    return ExpertResponse(**expert)


@router.post("/sos/request", response_model=SOSRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_sos(payload: SOSRequestCreate) -> SOSRequestResponse:
    request = await create_sos_request(payload.model_dump())
    return SOSRequestResponse(**request)


@router.get("/sos/request/{request_id}", response_model=SOSRequestResponse)
async def read_sos_status(request_id: str) -> SOSRequestResponse:
    request = await get_sos_status(request_id)
    return SOSRequestResponse(**request)


@router.post("/sos/request/{request_id}/callback", response_model=CallbackResponse)
async def create_callback(request_id: str) -> CallbackResponse:
    result = await schedule_expert_callback(request_id)
    return CallbackResponse(**result)


@router.get("/sos/agri-shops", response_model=ShopsResponse)
async def read_agri_shops(
    state: str = Query(..., min_length=2),
    district: str = Query(..., min_length=2),
) -> ShopsResponse:
    shops = await get_agri_shops(state, district)
    return ShopsResponse(shops=[ShopResponse(**item) for item in shops])


@router.get("/sos/krishi-kendras", response_model=KendrasResponse)
async def read_krishi_kendras(
    state: str = Query(..., min_length=2),
    district: str = Query(..., min_length=2),
) -> KendrasResponse:
    kendras = await get_krishi_kendras(state, district)
    return KendrasResponse(kendras=[KendraResponse(**item) for item in kendras])


@router.get("/sos/helplines", response_model=HelplinesResponse)
async def read_helplines() -> HelplinesResponse:
    result = await get_helplines()
    return HelplinesResponse(**result)
