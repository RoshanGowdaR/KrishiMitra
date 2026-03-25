import httpx
from fastapi import HTTPException

from app.config import get_settings


class GroqClient:
    def __init__(self):
        settings = get_settings()
        self.keys = []
        for key in [
            getattr(settings, "groq_api_key_1", None),
            getattr(settings, "groq_api_key_2", None),
            getattr(settings, "groq_api_key_3", None),
        ]:
            if key and key not in self.keys and key.startswith("gsk_"):
                self.keys.append(key)

        self.current_index = 0
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.3-70b-versatile"

    def get_current_key(self):
        if not self.keys:
            raise HTTPException(status_code=500, detail="No valid Groq API keys found")
        return self.keys[self.current_index]

    def rotate_key(self):
        self.current_index = (self.current_index + 1) % len(self.keys)
        print(f"Rotated to Groq key {self.current_index + 1}")

    async def chat(
        self,
        messages: list,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        if not self.keys:
            raise HTTPException(status_code=500, detail="No valid Groq API keys found")

        last_error = None

        for attempt in range(len(self.keys)):
            api_key = self.get_current_key()

            request_body = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False,
            }

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        self.base_url,
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json=request_body,
                    )

                print(f"Groq attempt {attempt + 1} key {self.current_index + 1}: status={response.status_code}")

                if response.status_code == 429:
                    print(f"Groq key {self.current_index + 1} rate limited, rotating...")
                    self.rotate_key()
                    last_error = "Rate limit exceeded"
                    continue

                if response.status_code == 401:
                    print(f"Groq key {self.current_index + 1} unauthorized, rotating...")
                    self.rotate_key()
                    last_error = "Unauthorized"
                    continue

                if response.status_code != 200:
                    print(f"Groq error {response.status_code}: {response.text[:300]}")
                    last_error = f"Status {response.status_code}"
                    self.rotate_key()
                    continue

                data = response.json()
                text = data["choices"][0]["message"]["content"]
                print(f"Groq success! Response length: {len(text)}")
                return text

            except HTTPException:
                raise
            except Exception as exc:  # noqa: BLE001
                print(f"Groq exception: {str(exc)}")
                last_error = str(exc)
                self.rotate_key()
                continue

        raise HTTPException(
            status_code=502,
            detail=f"All Groq API keys failed. Last error: {last_error}",
        )


groq_client = GroqClient()
