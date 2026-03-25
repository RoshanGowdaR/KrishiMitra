import json

import httpx
from fastapi import HTTPException

from app.config import get_settings


class GeminiClient:
    def __init__(self):
        settings = get_settings()
        self.keys = []
        for key in [
            getattr(settings, "gemini_api_key", None),
            getattr(settings, "gemini_api_key_1", None),
            getattr(settings, "gemini_api_key_2", None),
            getattr(settings, "gemini_api_key_3", None),
        ]:
            if key and key not in self.keys and key != "your_key":
                self.keys.append(key)

        if not self.keys:
            raise ValueError("No valid Gemini API keys found")

        self.current_index = 0
        self.model = "gemini-2.0-flash"
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def get_current_key(self):
        return self.keys[self.current_index]

    def rotate_key(self):
        self.current_index = (self.current_index + 1) % len(self.keys)

    async def generate(self, prompt: str, image_base64: str | None = None) -> str:
        last_error = None

        for attempt in range(len(self.keys)):
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

            request_body = {
                "contents": [
                    {
                        "role": "user",
                        "parts": parts,
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 1024,
                },
            }

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        self.base_url,
                        params={"key": api_key},
                        json=request_body,
                    )

                print(f"Gemini attempt {attempt + 1} key {self.current_index + 1}: status={response.status_code}")

                if response.status_code == 429:
                    print(f"Key {self.current_index + 1} quota exceeded, rotating...")
                    self.rotate_key()
                    last_error = "Quota exceeded"
                    continue

                if response.status_code == 400:
                    print(f"Bad request: {response.text}")
                    raise HTTPException(status_code=400, detail="Invalid request to Gemini")

                if response.status_code == 403:
                    print(f"Key {self.current_index + 1} forbidden, rotating...")
                    self.rotate_key()
                    last_error = "Forbidden"
                    continue

                if response.status_code != 200:
                    print(f"Gemini error {response.status_code}: {response.text[:500]}")
                    last_error = f"Status {response.status_code}"
                    self.rotate_key()
                    continue

                data = response.json()

                candidates = data.get("candidates", [])
                if not candidates:
                    last_error = "No candidates in response"
                    self.rotate_key()
                    continue

                content = candidates[0].get("content", {})
                content_parts = content.get("parts", [])
                if not content_parts:
                    last_error = "No parts in response"
                    self.rotate_key()
                    continue

                text = content_parts[0].get("text", "")
                if not text:
                    last_error = "Empty text in response"
                    self.rotate_key()
                    continue

                print(f"Gemini success! Response length: {len(text)}")
                return text

            except HTTPException:
                raise
            except Exception as exc:  # noqa: BLE001
                print(f"Gemini exception: {str(exc)}")
                last_error = str(exc)
                self.rotate_key()
                continue

        raise HTTPException(
            status_code=502,
            detail=f"All Gemini API keys failed. Last error: {last_error}",
        )

    async def generate_json(self, prompt: str, image_base64: str | None = None) -> dict:
        full_prompt = (
            prompt
            + "\n\nIMPORTANT: Return ONLY valid JSON. "
            "No markdown backticks. No explanation. Just JSON."
        )
        text = await self.generate(full_prompt, image_base64=image_base64)
        text = text.strip()

        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])

        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            print(f"JSON parse error: {exc}, text: {text[:200]}")
            raise HTTPException(
                status_code=502,
                detail="Could not parse JSON from Gemini response",
            ) from exc


gemini_client = GeminiClient()
