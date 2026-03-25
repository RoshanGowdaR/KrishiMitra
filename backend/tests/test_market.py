import httpx

from fastapi.testclient import TestClient

from app.main import app
from app.services import market_service

client = TestClient(app)


class MockResponse:
    def __init__(self, payload: dict, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.request = httpx.Request("GET", "https://api.data.gov.in")

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

    async def get(self, url: str, params: dict) -> MockResponse:
        state = params.get("filters[state]", "")
        district = params.get("filters[district]", "")

        if state == "InvalidState":
            return MockResponse({"records": []})

        if state == "Karnataka" and district == "Udupi":
            return MockResponse(
                {
                    "records": [
                        {
                            "state": "Karnataka",
                            "district": "Udupi",
                            "market": "Udupi",
                            "commodity": "Rice",
                            "variety": "Sona",
                            "min_price": "2500",
                            "max_price": "2800",
                            "modal_price": "2650",
                            "arrival_date": "18/03/2026",
                        },
                        {
                            "state": "Karnataka",
                            "district": "Udupi",
                            "market": "Kundapura",
                            "commodity": "Maize",
                            "variety": "Hybrid",
                            "min_price": "1900",
                            "max_price": "2100",
                            "modal_price": "2000",
                            "arrival_date": "18/03/2026",
                        },
                    ]
                }
            )

        return MockResponse({"records": []})


def _patch_market_dependencies(monkeypatch) -> None:
    monkeypatch.setattr(market_service.httpx, "AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        market_service,
        "get_settings",
        lambda: type("Settings", (), {"data_gov_api_key": "test-key"})(),
    )


def test_prices_endpoint_returns_200_with_expected_fields(monkeypatch) -> None:
    _patch_market_dependencies(monkeypatch)

    response = client.get("/api/v1/market/prices?state=Karnataka&district=Bengaluru")

    assert response.status_code == 200
    body = response.json()
    assert "prices" in body
    assert len(body["prices"]) >= 1

    first_record = body["prices"][0]
    assert first_record["state"] == "Karnataka"
    assert first_record["district"] == "Bengaluru"
    assert first_record["market"] == "APMC Bengaluru"
    assert first_record["commodity"] == "Rice"
    assert first_record["variety"] == "Sona Masuri"
    assert float(first_record["min_price"]) == 2100.0
    assert float(first_record["max_price"]) == 2400.0
    assert float(first_record["modal_price"]) == 2250.0
    assert first_record["date"] == "2026-03-22"


def test_commodity_filter_returns_only_matching_records(monkeypatch) -> None:
    _patch_market_dependencies(monkeypatch)

    response = client.get(
        "/api/v1/market/prices?state=Karnataka&district=Bengaluru&commodity=Rice"
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["prices"]) == 1
    assert body["prices"][0]["commodity"] == "Rice"


def test_invalid_state_returns_proper_error(monkeypatch) -> None:
    _patch_market_dependencies(monkeypatch)

    response = client.get("/api/v1/market/prices?state=InvalidState&district=Nowhere")

    assert response.status_code == 200
    assert response.json() == {"prices": []}


def test_empty_results_handled_gracefully(monkeypatch) -> None:
    _patch_market_dependencies(monkeypatch)

    response = client.get("/api/v1/market/commodities?state=Kerala&district=Idukki")

    assert response.status_code == 200
    assert response.json() == {"commodities": []}
