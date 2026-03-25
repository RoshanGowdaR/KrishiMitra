from typing import Any
import logging

import httpx
from fastapi import HTTPException

from app.config import get_settings

OPENWEATHER_CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
logger = logging.getLogger(__name__)

FALLBACK_WEATHER = {
    "temperature": 30,
    "feels_like": 32,
    "humidity": 65,
    "wind_speed": 12,
    "description": "Clear sky",
    "city_name": "Bengaluru",
    "country": "IN",
    "icon_code": "01d",
}


def _get_api_key() -> str:
    api_key = get_settings().openweather_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENWEATHER_API_KEY is not configured",
        )
    return api_key


def _clean_weather_payload(payload: dict[str, Any]) -> dict[str, Any]:
    weather_items = payload.get("weather", [])
    weather = weather_items[0] if weather_items else {}
    main = payload.get("main", {})
    wind = payload.get("wind", {})
    sys_data = payload.get("sys", {})

    return {
        "temperature": main.get("temp"),
        "feels_like": main.get("feels_like"),
        "humidity": main.get("humidity"),
        "wind_speed": wind.get("speed"),
        "description": weather.get("description", ""),
        "city_name": payload.get("name", ""),
        "country": sys_data.get("country", ""),
        "icon_code": weather.get("icon", ""),
    }


async def _fetch_openweather(url: str, lat: float, lon: float) -> dict[str, Any]:
    params = {
        "lat": lat,
        "lon": lon,
        "appid": _get_api_key(),
        "units": "metric",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail="OpenWeatherMap returned an error",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach OpenWeatherMap service",
        ) from exc


async def get_weather(lat: float, lon: float) -> dict[str, Any]:
    try:
        payload = await _fetch_openweather(OPENWEATHER_CURRENT_URL, lat, lon)
        return _clean_weather_payload(payload)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Weather fetch failed for lat=%s lon=%s: %s", lat, lon, exc)
        return dict(FALLBACK_WEATHER)


async def get_forecast(lat: float, lon: float) -> list[dict[str, Any]]:
    try:
        payload = await _fetch_openweather(OPENWEATHER_FORECAST_URL, lat, lon)
        forecast_items = payload.get("list", [])

        cleaned_forecast: list[dict[str, Any]] = []
        for item in forecast_items:
            item_payload = {
                "main": item.get("main", {}),
                "wind": item.get("wind", {}),
                "weather": item.get("weather", []),
                "name": payload.get("city", {}).get("name", ""),
                "sys": {"country": payload.get("city", {}).get("country", "")},
            }
            cleaned_forecast.append(_clean_weather_payload(item_payload))

        return cleaned_forecast
    except Exception as exc:  # noqa: BLE001
        logger.exception("Forecast fetch failed for lat=%s lon=%s: %s", lat, lon, exc)
        return [dict(FALLBACK_WEATHER) for _ in range(5)]
