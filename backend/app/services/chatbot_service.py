from typing import Any

import httpx  # noqa: F401
from fastapi import HTTPException

from app.config import get_settings
from app.services.gemini_client import gemini_client

SUPPORTED_LANGUAGES: list[dict[str, str]] = [
    {"code": "en", "name": "English", "language_code": "en-IN", "voice_name": "en-IN-Wavenet-A"},
    {"code": "hi", "name": "Hindi", "language_code": "hi-IN", "voice_name": "hi-IN-Wavenet-A"},
    {"code": "kn", "name": "Kannada", "language_code": "kn-IN", "voice_name": "kn-IN-Wavenet-A"},
    {"code": "ta", "name": "Tamil", "language_code": "ta-IN", "voice_name": "ta-IN-Wavenet-A"},
    {"code": "te", "name": "Telugu", "language_code": "te-IN", "voice_name": "te-IN-Wavenet-A"},
    {"code": "ml", "name": "Malayalam", "language_code": "ml-IN", "voice_name": "ml-IN-Wavenet-A"},
    {"code": "mr", "name": "Marathi", "language_code": "mr-IN", "voice_name": "mr-IN-Wavenet-A"},
    {"code": "gu", "name": "Gujarati", "language_code": "gu-IN", "voice_name": "gu-IN-Wavenet-A"},
    {"code": "bn", "name": "Bengali", "language_code": "bn-IN", "voice_name": "bn-IN-Wavenet-A"},
    {"code": "pa", "name": "Punjabi", "language_code": "pa-IN", "voice_name": "pa-IN-Wavenet-A"},
]
def _normalize_history(conversation_history: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for item in conversation_history:
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role not in {"user", "assistant"} or not content:
            continue
        normalized.append({"role": role, "content": content})
    return normalized


async def _call_gemini(
    contents: list[dict[str, Any]],
    system_prompt: str,
) -> str:
    settings = get_settings()
    fallback_key = getattr(settings, "gemini_api_key", "")
    if fallback_key and not gemini_client.keys:
        gemini_client.keys = [fallback_key]
        gemini_client.current_index = 0

    serialized_history = "\n".join(
        f"{item.get('role', 'user')}: {item.get('parts', [{}])[0].get('text', '')}" for item in contents
    )
    prompt = f"System instruction:\n{system_prompt}\n\nConversation:\n{serialized_history}"
    return await gemini_client.generate(prompt)


async def get_chat_response(
    message: str,
    conversation_history: list[dict[str, str]],
    language: str = "en",
) -> dict[str, Any]:
    clean_message = message.strip()
    if not clean_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    normalized_history = _normalize_history(conversation_history)
    model_contents: list[dict[str, Any]] = []

    for item in normalized_history:
        role = "user" if item["role"] == "user" else "model"
        model_contents.append(
            {
                "role": role,
                "parts": [{"text": item["content"]}],
            }
        )

    model_contents.append({"role": "user", "parts": [{"text": clean_message}]})

    system_prompt = (
        "You are KrishiMitra, an expert Indian agricultural assistant. Provide practical, "
        "region-aware advice to farmers about crops, weather, market prices, government schemes, "
        "and disease management. Keep responses clear and actionable. Respond in the same language "
        f"as the user message. Preferred response language code: {language}."
    )

    response_text = await _call_gemini(model_contents, system_prompt=system_prompt)

    updated_history = normalized_history + [
        {"role": "user", "content": clean_message},
        {"role": "assistant", "content": response_text},
    ]

    return {
        "response_text": response_text,
        "conversation_history": updated_history,
        "language": language,
    }


async def translate_text(text: str, target_language: str) -> str:
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    contents = [
        {
            "role": "user",
            "parts": [
                {
                    "text": (
                        "Translate the following text into language code "
                        f"'{target_language}'. Return only translated text.\n\n{clean_text}"
                    )
                }
            ],
        }
    ]

    system_prompt = "You are a translation assistant for Indian agriculture use-cases."
    return await _call_gemini(contents, system_prompt=system_prompt)


async def text_to_speech_info(text: str, language: str) -> dict[str, str]:
    selected = next((item for item in SUPPORTED_LANGUAGES if item["code"] == language), None)
    if selected is None:
        selected = next(item for item in SUPPORTED_LANGUAGES if item["code"] == "en")

    return {
        "text": text,
        "language_code": selected["language_code"],
        "voice_name": selected["voice_name"],
    }
