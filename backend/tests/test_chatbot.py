from fastapi.testclient import TestClient

from app.main import app
from app.services import chatbot_service

client = TestClient(app)


async def _mock_groq_chat(messages: list, temperature: float = 0.7, max_tokens: int = 1024) -> str:
    _ = (temperature, max_tokens)
    last_message = messages[-1]["content"] if messages else ""

    if "Translate the following text" in last_message:
        return "यह अनुवादित संदेश है"
    if "Namaste" in last_message or "नमस्ते" in last_message:
        return "नमस्ते किसान, मैं आपकी मदद के लिए यहां हूं।"
    return "Hello farmer, I can help with your crop and weather questions."


def _patch_chatbot_dependencies(monkeypatch) -> None:
    monkeypatch.setattr(chatbot_service.groq_client, "chat", _mock_groq_chat)


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
