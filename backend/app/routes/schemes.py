from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.schemes_service import (
    check_eligibility,
    get_all_schemes,
    get_scheme_by_id,
)

router = APIRouter(tags=["Schemes"])


class SchemeResponse(BaseModel):
    id: str
    name: str
    description: str
    eligibility: list[str]
    benefits: list[str]
    application_process: list[str]
    deadline: str
    ministry: str
    scheme_type: Literal["subsidy", "insurance", "loan", "equipment", "training"]


class SchemeListResponse(BaseModel):
    schemes: list[SchemeResponse]


class FarmerProfileRequest(BaseModel):
    land_size: float = Field(..., ge=0)
    income: float = Field(..., ge=0)
    category: str = Field(..., min_length=1)


class EligibilityRequest(BaseModel):
    scheme_id: str = Field(..., min_length=1)
    language: str = Field(default="en", min_length=2)
    farmer_profile: FarmerProfileRequest


class EligibilityResponse(BaseModel):
    scheme_id: str
    scheme_name: str
    is_eligible: bool
    reason: str


@router.get("/schemes", response_model=SchemeListResponse)
async def read_schemes(
    language: str = Query(default="en", min_length=2),
) -> SchemeListResponse:
    schemes = await get_all_schemes(language=language)
    return SchemeListResponse(schemes=[SchemeResponse(**scheme) for scheme in schemes])


@router.get("/schemes/{scheme_id}", response_model=SchemeResponse)
async def read_scheme_by_id(
    scheme_id: str,
    language: str = Query(default="en", min_length=2),
) -> SchemeResponse:
    scheme = await get_scheme_by_id(scheme_id=scheme_id, language=language)
    return SchemeResponse(**scheme)


@router.post("/schemes/eligibility", response_model=EligibilityResponse)
async def read_eligibility(payload: EligibilityRequest) -> EligibilityResponse:
    result = await check_eligibility(
        scheme_id=payload.scheme_id,
        farmer_profile=payload.farmer_profile.model_dump(),
        language=payload.language,
    )
    return EligibilityResponse(**result)
