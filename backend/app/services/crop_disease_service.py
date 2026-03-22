import json
from typing import Any

import httpx  # noqa: F401
from fastapi import HTTPException

from app.config import get_settings
from app.services.gemini_client import gemini_client
SUPPORTED_CROPS = [
    "rice",
    "wheat",
    "maize",
    "cotton",
    "sugarcane",
    "soybean",
    "groundnut",
    "millet",
    "pulses",
    "tomato",
    "potato",
    "chilli",
]
def _parse_json_response(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Gemini returned invalid JSON") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="Gemini returned invalid response shape")

    return parsed


async def get_healthy_crop_info(crop_name: str) -> dict[str, Any]:
    normalized = crop_name.strip().lower()
    if normalized not in SUPPORTED_CROPS:
        return {
            "crop_name": crop_name,
            "supported": False,
            "tips": [
                "Crop is not yet in the curated supported crop list.",
                "Consult your local agriculture extension officer for region-specific guidance.",
            ],
        }

    return {
        "crop_name": crop_name,
        "supported": True,
        "tips": [
            "Use certified seeds and follow crop-specific spacing.",
            "Monitor fields weekly for early pest and disease symptoms.",
            "Use balanced fertilizers based on soil test recommendations.",
            "Maintain proper irrigation and avoid prolonged water stress.",
        ],
    }


async def analyze_crop_image(image_base64: str, language: str = "en") -> dict[str, Any]:
    settings = get_settings()
    fallback_key = getattr(settings, "gemini_api_key", "")
    if fallback_key and not gemini_client.keys:
        gemini_client.keys = [fallback_key]
        gemini_client.current_index = 0

    prompt = (
        "You are an agricultural crop disease expert for India. Analyze the image and return "
        "ONLY valid JSON with keys: is_crop (boolean), crop_type (string), disease_name (string), "
        "severity (one of mild/moderate/severe), symptoms (array of strings), treatment (array of strings), "
        "prevention_tips (array of strings), not_crop_reason (string). "
        f"Respond in language code '{language}'. If image is not a crop, set is_crop=false and provide not_crop_reason."
    )

    generated = await gemini_client.generate(prompt, image_base64=image_base64)
    parsed = _parse_json_response(generated)

    if not parsed.get("is_crop", False):
        reason = parsed.get("not_crop_reason", "Uploaded image is not a crop image")
        raise HTTPException(status_code=422, detail=reason)

    crop_type = str(parsed.get("crop_type", "")).strip()
    healthy_info = await get_healthy_crop_info(crop_type)

    return {
        "crop_type": crop_type,
        "disease_name": str(parsed.get("disease_name", "Unknown")),
        "severity": str(parsed.get("severity", "moderate")).lower(),
        "symptoms": [str(item) for item in parsed.get("symptoms", [])],
        "treatment": [str(item) for item in parsed.get("treatment", [])],
        "prevention_tips": [str(item) for item in parsed.get("prevention_tips", [])],
        "language": language,
        "healthy_crop_info": healthy_info,
    }
