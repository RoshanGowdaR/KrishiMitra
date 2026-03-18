import base64
import binascii
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.crop_disease_service import SUPPORTED_CROPS, analyze_crop_image

router = APIRouter(tags=["Crop Disease"])
MAX_IMAGE_BYTES = 5 * 1024 * 1024


class CropDiseaseAnalyzeRequest(BaseModel):
    image_base64: str = Field(..., min_length=1)
    language: str = Field(default="en", min_length=2, max_length=5)


class HealthyCropInfoResponse(BaseModel):
    crop_name: str
    supported: bool
    tips: list[str]


class CropDiseaseAnalyzeResponse(BaseModel):
    crop_type: str
    disease_name: str
    severity: Literal["mild", "moderate", "severe"]
    symptoms: list[str]
    treatment: list[str]
    prevention_tips: list[str]
    language: str
    healthy_crop_info: HealthyCropInfoResponse


class SupportedCropsResponse(BaseModel):
    crops: list[str]


def _validate_base64_size(image_base64: str) -> None:
    try:
        image_bytes = base64.b64decode(image_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("Invalid base64 image data") from exc

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise OverflowError("Image size exceeds 5MB limit")


@router.post("/crop-disease/analyze", response_model=CropDiseaseAnalyzeResponse)
async def analyze_crop_disease(payload: CropDiseaseAnalyzeRequest) -> CropDiseaseAnalyzeResponse:
    try:
        _validate_base64_size(payload.image_base64)
    except ValueError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OverflowError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=413, detail=str(exc)) from exc

    result = await analyze_crop_image(payload.image_base64, language=payload.language)
    return CropDiseaseAnalyzeResponse(**result)


@router.get("/crop-disease/crops", response_model=SupportedCropsResponse)
async def get_supported_crops(
    language: str = Query(default="en", min_length=2, max_length=5),
) -> SupportedCropsResponse:
    _ = language
    return SupportedCropsResponse(crops=SUPPORTED_CROPS)
