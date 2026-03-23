from typing import Any

import httpx  # noqa: F401
from fastapi import HTTPException

from app.config import get_settings  # noqa: F401
from app.services.groq_client import groq_client

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


async def get_chat_response(
    message: str,
    conversation_history: list[dict[str, str]],
    language: str = "en",
) -> dict[str, Any]:
    clean_message = message.strip()
    if not clean_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    normalized_history = _normalize_history(conversation_history)

    system_prompt = """You are KrishiMitra, an expert 
Indian agricultural AI assistant helping farmers.
You provide practical advice on:
- Crop management and cultivation
- Pest and disease identification and treatment
- Weather interpretation for farming
- Government schemes and subsidies
- Market prices and selling strategies
- Soil health and fertilizer recommendations

Rules:
- Always respond in the SAME language as the user
- If user writes in Kannada reply in Kannada
- If user writes in Hindi reply in Hindi
- Keep responses concise and practical
- Use simple language farmers can understand
- Always give actionable advice
- If asking about a crop disease suggest treatment"""

    messages = [{"role": "system", "content": system_prompt}]

    for msg in normalized_history[-10:]:
        if msg.get("role") and msg.get("content"):
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

    messages.append({"role": "user", "content": clean_message})

    response_text = await groq_client.chat(
        messages=messages,
        temperature=0.7,
        max_tokens=512,
    )

    updated_history = normalized_history + [
        {"role": "user", "content": clean_message},
        {"role": "assistant", "content": response_text},
    ]

    return {
        "response_text": response_text,
        "conversation_history": updated_history,
        "language": language,
        "response": response_text,
        "history": updated_history,
    }


async def translate_text(text: str, target_language: str) -> str:
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    messages = [
        {
            "role": "system",
            "content": "You are a translation assistant for Indian agriculture use-cases.",
        },
        {
            "role": "user",
            "content": (
                "Translate the following text into language code "
                f"'{target_language}'. Return only translated text.\n\n{clean_text}"
            ),
        },
    ]
    return await groq_client.chat(messages=messages, temperature=0.2, max_tokens=256)


async def text_to_speech_info(text: str, language: str) -> dict[str, str]:
    selected = next((item for item in SUPPORTED_LANGUAGES if item["code"] == language), None)
    if selected is None:
        selected = next(item for item in SUPPORTED_LANGUAGES if item["code"] == "en")

    return {
        "text": text,
        "language_code": selected["language_code"],
        "voice_name": selected["voice_name"],
    }
