import asyncio
import json

import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.services.forum_service import get_posts, reset_forum_store
from app.services import sos_service
from app.services.sos_service import add_expert, reset_sos_state, set_expert_availability

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
        _ = (url, params, json)
        payload = {
            "disease_identification": "Bacterial leaf blight",
            "severity": "high",
            "medicine_name": "Copper Oxychloride 50% WP",
            "dosage": "2.5 g per liter of water",
            "application_instructions": "Spray uniformly on both sides of leaves in evening.",
            "action_plan_24hr": "Remove severely infected leaves and isolate affected patch.",
            "action_plan_48hr": "Apply first spray and monitor spread boundary.",
            "action_plan_72hr": "Repeat spray if spread continues and contact expert callback.",
            "what_to_avoid": "Do not over-irrigate or mix incompatible chemicals.",
        }
        return MockResponse(
            {
                "candidates": [
                    {"content": {"parts": [{"text": json_dumps(payload)}]}}
                ]
            }
        )


def json_dumps(payload: dict) -> str:
    return json.dumps(payload)


def _sos_payload() -> dict:
    return {
        "farmer_name": "Mahesh",
        "phone": "9876543210",
        "state": "Karnataka",
        "district": "Hassan",
        "issue_type": "crop_disease",
        "description": "Leaves are drying quickly and spots are spreading.",
        "image_base64": "ZmFrZS1pbWFnZS1kYXRh",
        "urgency": "critical",
    }


def _reset_all() -> None:
    asyncio.run(reset_sos_state())
    asyncio.run(reset_forum_store())


def test_get_experts_returns_list_with_correct_fields() -> None:
    _reset_all()

    response = client.get("/api/v1/sos/experts")

    assert response.status_code == 200
    experts = response.json()["experts"]
    assert len(experts) > 0
    required = {
        "id",
        "name",
        "specialization",
        "state",
        "district",
        "phone",
        "language",
        "rating",
        "available",
        "is_remote",
        "experience_years",
    }
    assert required.issubset(experts[0].keys())


def test_filter_by_specialization_works() -> None:
    _reset_all()

    response = client.get("/api/v1/sos/experts?specialization=crop_disease")

    assert response.status_code == 200
    experts = response.json()["experts"]
    assert len(experts) > 0
    assert all(item["specialization"] == "crop_disease" for item in experts)


def test_filter_by_district_works() -> None:
    _reset_all()

    response = client.get("/api/v1/sos/experts?district=Hassan")

    assert response.status_code == 200
    experts = response.json()["experts"]
    assert len(experts) > 0
    assert all(item["district"] == "Hassan" for item in experts)


def test_get_expert_by_invalid_id_returns_404() -> None:
    response = client.get("/api/v1/sos/experts/invalid-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Expert not found"


def test_sos_request_level_1_assigns_district_expert() -> None:
    _reset_all()

    response = client.post("/api/v1/sos/request", json=_sos_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["fallback_level"] == 1
    assert body["status"] == "assigned"
    assert body["assigned_expert"]["district"] == "Hassan"


def test_sos_request_level_2_expands_to_neighboring_district() -> None:
    _reset_all()
    asyncio.run(set_expert_availability("exp-001", False))
    asyncio.run(
        add_expert(
            {
                "id": "exp-900",
                "name": "Dr. Neighbor Expert",
                "specialization": "crop_disease",
                "state": "Karnataka",
                "district": "Mysuru",
                "phone": "9000000000",
                "language": "kn",
                "rating": 4.4,
                "available": True,
                "is_remote": False,
                "experience_years": 7,
            }
        )
    )

    response = client.post("/api/v1/sos/request", json=_sos_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["fallback_level"] == 2
    assert body["assigned_expert"]["district"] == "Mysuru"


def test_sos_request_level_3_assigns_remote_expert() -> None:
    _reset_all()
    asyncio.run(set_expert_availability("exp-001", False))

    response = client.post("/api/v1/sos/request", json=_sos_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["fallback_level"] == 3
    assert body["assigned_expert"]["is_remote"] is True


def test_sos_request_level_4_returns_full_ai_response(monkeypatch) -> None:
    _reset_all()
    monkeypatch.setattr("app.services.sos_service.httpx.AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        sos_service,
        "get_settings",
        lambda: type("Settings", (), {"gemini_api_key": "test-key"})(),
    )

    asyncio.run(set_expert_availability("exp-001", False))
    asyncio.run(set_expert_availability("exp-006", False))

    response = client.post("/api/v1/sos/request", json=_sos_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["fallback_level"] == 4
    assert body["status"] == "ai_assisted"
    ai_response = body["ai_response"]
    assert ai_response["medicine_name"] == "Copper Oxychloride 50% WP"
    assert "dosage" in ai_response
    assert "action_plan_24hr" in ai_response
    assert "action_plan_48hr" in ai_response
    assert "action_plan_72hr" in ai_response


def test_level_4_creates_community_forum_post_automatically(monkeypatch) -> None:
    _reset_all()
    monkeypatch.setattr("app.services.sos_service.httpx.AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        sos_service,
        "get_settings",
        lambda: type("Settings", (), {"gemini_api_key": "test-key"})(),
    )

    asyncio.run(set_expert_availability("exp-001", False))
    asyncio.run(set_expert_availability("exp-006", False))

    response = client.post("/api/v1/sos/request", json=_sos_payload())

    assert response.status_code == 201
    posts = asyncio.run(get_posts(category="crop_issues"))
    assert len(posts) >= 1
    assert any("URGENT SOS" in item["title"] for item in posts)


def test_level_4_schedules_expert_callback(monkeypatch) -> None:
    _reset_all()
    monkeypatch.setattr("app.services.sos_service.httpx.AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        sos_service,
        "get_settings",
        lambda: type("Settings", (), {"gemini_api_key": "test-key"})(),
    )

    asyncio.run(set_expert_availability("exp-001", False))
    asyncio.run(set_expert_availability("exp-006", False))

    response = client.post("/api/v1/sos/request", json=_sos_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["callback_scheduled"] is True
    assert body["ai_response"]["callback_scheduled"] is True


def test_get_agri_shops_returns_list_with_correct_fields() -> None:
    response = client.get("/api/v1/sos/agri-shops?state=Karnataka&district=Hassan")

    assert response.status_code == 200
    shops = response.json()["shops"]
    assert len(shops) > 0
    assert {"name", "address", "phone", "district", "state", "speciality"}.issubset(
        shops[0].keys()
    )


def test_get_krishi_kendras_returns_list() -> None:
    response = client.get("/api/v1/sos/krishi-kendras?state=Karnataka&district=Hassan")

    assert response.status_code == 200
    kendras = response.json()["kendras"]
    assert isinstance(kendras, list)
    assert len(kendras) > 0


def test_get_helplines_returns_all_numbers_including_statewise() -> None:
    response = client.get("/api/v1/sos/helplines")

    assert response.status_code == 200
    body = response.json()
    assert any(item["number"] == "1800-180-1551" for item in body["national"])
    assert len(body["statewise"]) >= 10
    assert "Karnataka" in body["statewise"]


def test_schedule_callback_returns_200() -> None:
    _reset_all()
    created = client.post("/api/v1/sos/request", json=_sos_payload()).json()

    response = client.post(f"/api/v1/sos/request/{created['id']}/callback")

    assert response.status_code == 200
    assert response.json()["callback_scheduled"] is True
