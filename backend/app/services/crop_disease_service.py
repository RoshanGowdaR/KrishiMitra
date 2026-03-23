import json
import httpx
from app.config import get_settings

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


GEMINI_VISION_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
]


async def analyze_crop_image(
    image_base64: str,
    language: str = "en"
) -> dict:
    settings = get_settings()

    # Collect all valid Gemini keys
    keys = []
    for k in [
        getattr(settings, "gemini_api_key", None),
        getattr(settings, "gemini_api_key_1", None),
        getattr(settings, "gemini_api_key_2", None),
        getattr(settings, "gemini_api_key_3", None),
    ]:
        if k and k not in keys and k != "your_key":
            keys.append(k)

    prompt = f"""You are an expert agricultural scientist.
Analyze this crop image carefully and provide:
1. What crop is shown in the image
2. Whether there is any disease or pest damage
3. Severity level: healthy, mild, moderate, or severe
4. Visible symptoms you can see
5. Recommended treatment with specific medicine names
6. Prevention tips for future

Respond in '{language}' language.
Return ONLY valid JSON with these exact keys:
{{
  "crop_type": "name of crop",
  "disease_name": "name of disease or Healthy",
  "severity": "healthy/mild/moderate/severe",
  "symptoms": ["symptom 1", "symptom 2"],
  "treatment": ["treatment step 1", "treatment step 2"],
  "prevention_tips": ["tip 1", "tip 2"]
}}"""

    request_body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1024
        }
    }

    # Try each model with each key
    for model in GEMINI_VISION_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        for key in keys:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        url,
                        params={"key": key},
                        json=request_body
                    )

                    print(f"Crop disease: model={model} status={response.status_code}")

                    if response.status_code == 429:
                        print(f"Quota exceeded for model={model}, trying next...")
                        continue

                    if response.status_code == 404:
                        print(f"Model {model} not found, trying next model...")
                        break  # Try next model

                    if response.status_code != 200:
                        print(f"Error {response.status_code}: {response.text[:200]}")
                        continue

                    data = response.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        continue

                    text = candidates[0]["content"]["parts"][0]["text"]
                    text = text.strip()

                    # Clean markdown if present
                    if "```" in text:
                        parts = text.split("```")
                        for part in parts:
                            if "{" in part:
                                text = part
                                if text.startswith("json"):
                                    text = text[4:]
                                break

                    text = text.strip()

                    try:
                        result = json.loads(text)
                        # Ensure all required fields exist
                        result.setdefault("crop_type", "Unknown crop")
                        result.setdefault("disease_name", "Analysis complete")
                        result.setdefault("severity", "moderate")
                        result.setdefault("symptoms", [])
                        result.setdefault("treatment", [])
                        result.setdefault("prevention_tips", [])
                        print(f"Crop disease success with model={model}")
                        crop_type = str(result.get("crop_type", "Unknown crop"))
                        healthy_info = await get_healthy_crop_info(crop_type)
                        severity = str(result.get("severity", "moderate")).lower()
                        if severity not in {"mild", "moderate", "severe"}:
                            severity = "moderate"

                        return {
                            "crop_type": crop_type,
                            "disease_name": str(result.get("disease_name", "Analysis complete")),
                            "severity": severity,
                            "symptoms": [str(item) for item in result.get("symptoms", [])],
                            "treatment": [str(item) for item in result.get("treatment", [])],
                            "prevention_tips": [str(item) for item in result.get("prevention_tips", [])],
                            "language": language,
                            "healthy_crop_info": healthy_info,
                        }
                    except json.JSONDecodeError:
                        # Return text as response
                        crop_type = "Crop detected"
                        healthy_info = await get_healthy_crop_info(crop_type)
                        return {
                            "crop_type": "Crop detected",
                            "disease_name": "See analysis below",
                            "severity": "moderate",
                            "symptoms": [text[:200]],
                            "treatment": ["Consult local Krishi Kendra"],
                            "prevention_tips": ["Monitor crop regularly"],
                            "language": language,
                            "healthy_crop_info": healthy_info,
                        }

            except Exception as e:
                print(f"Exception with model={model}: {str(e)}")
                continue

    # All models and keys failed - return helpful fallback
    crop_type = "Unable to analyze"
    healthy_info = await get_healthy_crop_info(crop_type)
    return {
        "crop_type": "Unable to analyze",
        "disease_name": "API quota exceeded",
        "severity": "moderate",
        "symptoms": [
            "All Gemini API quotas are currently exhausted",
            "Please try again after some time"
        ],
        "treatment": [
            "Contact your local Krishi Kendra for immediate help",
            "Call Kisan helpline: 1800-180-1551"
        ],
        "prevention_tips": [
            "Take clear photos of affected leaves",
            "Note when symptoms first appeared",
            "Try again in 1 hour when quota resets"
        ],
        "language": language,
        "healthy_crop_info": healthy_info,
    }


async def get_healthy_crop_info(crop_name: str) -> dict:
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
            f"Water {crop_name} regularly but avoid waterlogging",
            f"Apply balanced NPK fertilizer for {crop_name}",
            f"Monitor {crop_name} weekly for pest signs",
            f"Harvest {crop_name} at proper maturity stage"
        ]
    }
