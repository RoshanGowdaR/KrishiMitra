import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.services import chatbot_service

client = TestClient(app)


class MockResponse:
    def __init__(self, payload: dict, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.request = httpx.Request("POST", "https://generativelanguage.googleapis.com")

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                message="upstream error",
                request=self.request,
                response=httpx.Response(self.status_code, request=self.request),
            )


class MockAsyncClient:
    def __init__(self, timeout: float) -> None:
        self.timeout = timeout

    async def __aenter__(self) -> "MockAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    async def post(self, url: str, params: dict, json: dict) -> MockResponse:
        _ = (url, params)
        contents = json.get("contents", [])
        first_user_text = ""
        if contents:
            first_user_text = contents[0].get("parts", [{}])[0].get("text", "")

        if "Translate the following text" in first_user_text:
            text = "यह अनुवादित संदेश है"
        elif "Namaste" in first_user_text or "नमस्ते" in first_user_text:
            text = "नमस्ते किसान, मैं आपकी मदद के लिए यहां हूं।"
        else:
            text = "Hello farmer, I can help with your crop and weather questions."

        return MockResponse(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": text}],
                        }
                    }
                ]
            }
        )


def _patch_chatbot_dependencies(monkeypatch) -> None:
    monkeypatch.setattr(chatbot_service.httpx, "AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        chatbot_service,
        "get_settings",
        lambda: type("Settings", (), {"gemini_api_key": "test-key"})(),
    )


def test_chat_message_returns_200_with_response_and_history(monkeypatch) -> None:
    _patch_chatbot_dependencies(monkeypatch)

    payload = {
        "message": "What fertilizer is good for rice?",
        "conversation_history": [],
        "language": "en",
    }
    response = client.post("/api/v1/chatbot/message", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert "response_text" in body
    assert len(body["conversation_history"]) == 2
    assert body["conversation_history"][0]["role"] == "user"
    assert body["conversation_history"][1]["role"] == "assistant"


def test_conversation_history_is_maintained_correctly(monkeypatch) -> None:
    _patch_chatbot_dependencies(monkeypatch)

    payload = {
        "message": "What about irrigation schedule?",
        "conversation_history": [
            {"role": "user", "content": "My crop is rice"},
            {"role": "assistant", "content": "Noted. Please share your question."},
        ],
        "language": "en",
    }
    response = client.post("/api/v1/chatbot/message", json=payload)

    assert response.status_code == 200
    history = response.json()["conversation_history"]
    assert len(history) == 4
    assert history[0]["content"] == "My crop is rice"
    assert history[-1]["role"] == "assistant"


def test_language_parameter_returns_response_in_correct_language(monkeypatch) -> None:
    _patch_chatbot_dependencies(monkeypatch)

    payload = {
        "message": "Namaste",
        "conversation_history": [],
        "language": "hi",
    }
    response = client.post("/api/v1/chatbot/message", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "hi"
    assert "नमस्ते" in body["response_text"]


def test_translate_endpoint_works_correctly(monkeypatch) -> None:
    _patch_chatbot_dependencies(monkeypatch)

    response = client.post(
        "/api/v1/chatbot/translate",
        json={"text": "This is a translated message", "target_language": "hi"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["target_language"] == "hi"
    assert body["translated_text"] == "यह अनुवादित संदेश है"


def test_languages_endpoint_returns_correct_list() -> None:
    response = client.get("/api/v1/chatbot/languages")

    assert response.status_code == 200
    body = response.json()
    assert "languages" in body
    assert any(item["code"] == "hi" for item in body["languages"])


def test_empty_message_returns_400_error() -> None:
    payload = {
        "message": "   ",
        "conversation_history": [],
        "language": "en",
    }
    response = client.post("/api/v1/chatbot/message", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Message cannot be empty"
