import json

import httpx
from fastapi import HTTPException

from app.config import get_settings


class GeminiClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.keys = [
            settings.gemini_api_key,
            settings.gemini_api_key_1,
            settings.gemini_api_key_2,
            settings.gemini_api_key_3,
        ]
        seen: set[str] = set()
        unique_keys: list[str] = []
        for key in self.keys:
            if key and key not in seen:
                seen.add(key)
                unique_keys.append(key)

        self.keys = unique_keys
        self.current_index = 0
        self.base_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-1.5-flash:generateContent"
        )

    def get_current_key(self) -> str:
        if not self.keys:
            raise HTTPException(status_code=500, detail="No Gemini API key configured")
        return self.keys[self.current_index]

    def rotate_key(self) -> None:
        if not self.keys:
            return
        self.current_index = (self.current_index + 1) % len(self.keys)

    async def generate(self, prompt: str, image_base64: str | None = None) -> str:
        if not self.keys:
            raise HTTPException(status_code=500, detail="No Gemini API key configured")

        last_error = None
        for _attempt in range(len(self.keys)):
            try:
                api_key = self.get_current_key()
                parts = [{"text": prompt}]
                if image_base64:
                    parts.append(
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64,
                            }
                        }
                    )

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        self.base_url,
                        params={"key": api_key},
                        json={"contents": [{"parts": parts}]},
                    )

                if response.status_code == 429:
                    self.rotate_key()
                    last_error = "Quota exceeded"
                    continue
                if response.status_code == 403:
                    self.rotate_key()
                    last_error = "Invalid API key"
                    continue
                if response.status_code >= 400:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Gemini API error: {response.status_code}",
                    )

                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
            except HTTPException:
                raise
            except Exception as exc:  # noqa: BLE001
                last_error = str(exc)
                self.rotate_key()

        raise HTTPException(
            status_code=503,
            detail=f"All Gemini API keys exhausted. Last error: {last_error}",
        )

    async def generate_json(self, prompt: str, image_base64: str | None = None) -> dict:
        full_prompt = (
            prompt
            + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no explanation."
        )
        text = await self.generate(full_prompt, image_base64=image_base64)
        text = text.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="Invalid JSON from Gemini") from exc


gemini_client = GeminiClient()
