import json
from typing import Any

import httpx
from fastapi import HTTPException

from app.config import get_settings

GEMINI_MODEL = "gemini-1.5-flash"
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)
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


def _get_api_key() -> str:
    api_key = get_settings().gemini_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")
    return api_key


def _extract_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates", [])
    if not candidates:
        raise HTTPException(status_code=502, detail="Gemini returned no candidates")

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])
    for part in parts:
        text = part.get("text")
        if isinstance(text, str) and text.strip():
            return text.strip()

    raise HTTPException(status_code=502, detail="Gemini returned an empty response")


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
    prompt = (
        "You are an agricultural crop disease expert for India. Analyze the image and return "
        "ONLY valid JSON with keys: is_crop (boolean), crop_type (string), disease_name (string), "
        "severity (one of mild/moderate/severe), symptoms (array of strings), treatment (array of strings), "
        "prevention_tips (array of strings), not_crop_reason (string). "
        f"Respond in language code '{language}'. If image is not a crop, set is_crop=false and provide not_crop_reason."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64,
                        }
                    },
                ]
            }
        ]
    }

    params = {"key": _get_api_key()}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(GEMINI_API_URL, params=params, json=payload)
            response.raise_for_status()
            raw_response = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail="Gemini API returned an error",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Unable to reach Gemini API") from exc

    parsed = _parse_json_response(_extract_text(raw_response))

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
