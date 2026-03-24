from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.config import get_supabase_client
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


def _load_custom_schemes(language: str) -> list[dict]:
    try:
        supabase = get_supabase_client()
    except RuntimeError:
        return []

    try:
        response = (
            supabase
            .table("custom_schemes")
            .select("id, name, description, language, deadline, ministry")
            .eq("language", language.lower())
            .execute()
        )
    except Exception:
        return []

    rows = response.data or []
    transformed = []
    for row in rows:
        transformed.append({
            "id": row.get("id"),
            "name": row.get("name") or "Custom Scheme",
            "description": row.get("description") or "Custom scheme added by admin",
            "eligibility": ["As declared by admin"],
            "benefits": ["Refer scheme description"],
            "application_process": ["Contact local office or in-app support"],
            "deadline": row.get("deadline") or "Open",
            "ministry": row.get("ministry") or "State / Local Authority",
            "scheme_type": "training",
        })

    return transformed


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
    schemes.extend(_load_custom_schemes(language=language))
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
