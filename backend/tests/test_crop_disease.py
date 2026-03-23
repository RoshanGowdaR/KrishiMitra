import base64
import json

import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.services import crop_disease_service

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

    async def post(self, url: str, headers: dict, json: dict) -> MockResponse:
        _ = (url, headers)
        prompt_text = json["messages"][0]["content"][0]["text"]

        if "'hi'" in prompt_text:
            response_json = {
                "is_crop": True,
                "crop_type": "Rice",
                "disease_name": "ब्लास्ट रोग",
                "severity": "moderate",
                "symptoms": ["पत्तियों पर धब्बे"],
                "treatment": ["उपयुक्त फफूंदनाशक का छिड़काव"],
                "prevention_tips": ["बीज उपचार करें"],
                "not_crop_reason": "",
            }
        else:
            response_json = {
                "is_crop": True,
                "crop_type": "Rice",
                "disease_name": "Blast",
                "severity": "moderate",
                "symptoms": ["Lesions on leaves"],
                "treatment": ["Apply recommended fungicide"],
                "prevention_tips": ["Use resistant varieties"],
                "not_crop_reason": "",
            }

        if "not-a-crop" in prompt_text:
            response_json = {
                "is_crop": False,
                "crop_type": "",
                "disease_name": "",
                "severity": "mild",
                "symptoms": [],
                "treatment": [],
                "prevention_tips": [],
                "not_crop_reason": "The uploaded image is not a crop.",
            }

        return MockResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": json_module_dumps(response_json),
                        }
                    }
                ]
            }
        )


def json_module_dumps(payload: dict) -> str:
    return json.dumps(payload)


def _patch_dependencies(monkeypatch) -> None:
    monkeypatch.setattr(crop_disease_service.httpx, "AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        crop_disease_service,
        "get_settings",
        lambda: type(
            "Settings",
            (),
            {
                "groq_api_key_1": "gsk_test_key_1",
                "groq_api_key_2": "gsk_test_key_2",
                "groq_api_key_3": "gsk_test_key_3",
            },
        )(),
    )


def test_analyze_endpoint_returns_expected_fields(monkeypatch) -> None:
    _patch_dependencies(monkeypatch)

    image_base64 = base64.b64encode(b"fake-image-bytes").decode("utf-8")
    response = client.post(
        "/api/v1/crop-disease/analyze",
        json={"image_base64": image_base64, "language": "en"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["crop_type"] == "Rice"
    assert body["disease_name"] == "Blast"
    assert body["severity"] == "moderate"
    assert "symptoms" in body
    assert "treatment" in body
    assert "prevention_tips" in body


def test_invalid_image_returns_proper_error() -> None:
    response = client.post(
        "/api/v1/crop-disease/analyze",
        json={"image_base64": "invalid-base64", "language": "en"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid base64 image data"


def test_image_too_large_returns_413_error() -> None:
    large_bytes = b"a" * ((5 * 1024 * 1024) + 1)
    image_base64 = base64.b64encode(large_bytes).decode("utf-8")

    response = client.post(
        "/api/v1/crop-disease/analyze",
        json={"image_base64": image_base64, "language": "en"},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Image size exceeds 5MB limit"


def test_unsupported_crop_returns_helpful_message(monkeypatch) -> None:
    _patch_dependencies(monkeypatch)

    async def mock_post_unsupported(self, url: str, headers: dict, json: dict) -> MockResponse:
        _ = (self, url, headers, json)
        payload = {
            "is_crop": True,
            "crop_type": "Dragonfruit",
            "disease_name": "Unknown wilt",
            "severity": "mild",
            "symptoms": ["Leaf curl"],
            "treatment": ["Consult expert"],
            "prevention_tips": ["Monitor field"],
            "not_crop_reason": "",
        }
        return MockResponse(
            {
                "choices": [
                    {"message": {"content": json_module_dumps(payload)}}
                ]
            }
        )

    monkeypatch.setattr(MockAsyncClient, "post", mock_post_unsupported)

    image_base64 = base64.b64encode(b"fake-image-bytes").decode("utf-8")
    response = client.post(
        "/api/v1/crop-disease/analyze",
        json={"image_base64": image_base64, "language": "en"},
    )

    assert response.status_code == 200
    tips = response.json()["healthy_crop_info"]["tips"]
    assert any("curated supported crop list" in tip for tip in tips)


def test_language_parameter_works(monkeypatch) -> None:
    _patch_dependencies(monkeypatch)

    image_base64 = base64.b64encode(b"fake-image-bytes").decode("utf-8")
    response = client.post(
        "/api/v1/crop-disease/analyze",
        json={"image_base64": image_base64, "language": "hi"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "hi"
    assert body["disease_name"] == "ब्लास्ट रोग"
