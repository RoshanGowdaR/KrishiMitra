import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.services import weather_service

client = TestClient(app)


class MockResponse:
    def __init__(self, payload: dict, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.request = httpx.Request("GET", "https://api.openweathermap.org")

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
        if "forecast" in url:
            return MockResponse(
                {
                    "city": {"name": "Bengaluru", "country": "IN"},
                    "list": [
                        {
                            "main": {"temp": 29.0, "feels_like": 31.0, "humidity": 55},
                            "wind": {"speed": 4.8},
                            "weather": [{"description": "scattered clouds", "icon": "03d"}],
                        }
                    ],
                }
            )

        return MockResponse(
            {
                "main": {"temp": 30.0, "feels_like": 32.0, "humidity": 52},
                "wind": {"speed": 5.2},
                "weather": [{"description": "clear sky", "icon": "01d"}],
                "name": "Bengaluru",
                "sys": {"country": "IN"},
            }
        )


def test_current_weather_endpoint_returns_expected_shape(monkeypatch) -> None:
    monkeypatch.setattr(weather_service.httpx, "AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        weather_service,
        "get_settings",
        lambda: type("Settings", (), {"openweather_api_key": "test-key"})(),
    )

    response = client.get("/api/v1/weather?lat=12.97&lon=77.59")

    assert response.status_code == 200
    body = response.json()
    assert body["temperature"] == 30.0
    assert body["feels_like"] == 32.0
    assert body["humidity"] == 52
    assert body["wind_speed"] == 5.2
    assert body["description"] == "clear sky"
    assert body["city_name"] == "Bengaluru"
    assert body["country"] == "IN"
    assert body["icon_code"] == "01d"


def test_forecast_endpoint_returns_200(monkeypatch) -> None:
    monkeypatch.setattr(weather_service.httpx, "AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        weather_service,
        "get_settings",
        lambda: type("Settings", (), {"openweather_api_key": "test-key"})(),
    )

    response = client.get("/api/v1/weather/forecast?lat=12.97&lon=77.59")

    assert response.status_code == 200
    body = response.json()
    assert "forecast" in body
    assert len(body["forecast"]) == 1


def test_missing_api_key_returns_fallback(monkeypatch) -> None:
    monkeypatch.setattr(weather_service.httpx, "AsyncClient", MockAsyncClient)
    monkeypatch.setattr(
        weather_service,
        "get_settings",
        lambda: type("Settings", (), {"openweather_api_key": ""})(),
    )

    response = client.get("/api/v1/weather?lat=12.97&lon=77.59")

    assert response.status_code == 200
    body = response.json()
    assert body["city_name"] == "Bengaluru"
    assert body["description"] == "Clear sky"


def test_invalid_coordinates_return_validation_error() -> None:
    response = client.get("/api/v1/weather?lat=123.45&lon=999.99")

    assert response.status_code == 422
