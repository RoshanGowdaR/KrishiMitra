from typing import List

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.weather_service import get_forecast, get_weather

router = APIRouter(tags=["Weather"])


class WeatherResponse(BaseModel):
    temperature: float | None
    feels_like: float | None
    humidity: int | None
    wind_speed: float | None
    description: str
    city_name: str
    country: str
    icon_code: str


class ForecastResponse(BaseModel):
    forecast: List[WeatherResponse]


@router.get("/weather", response_model=WeatherResponse)
async def read_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> WeatherResponse:
    weather_data = await get_weather(lat=lat, lon=lon)
    return WeatherResponse(**weather_data)


@router.get("/weather/forecast", response_model=ForecastResponse)
async def read_forecast(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> ForecastResponse:
    forecast_data = await get_forecast(lat=lat, lon=lon)
    return ForecastResponse(forecast=[WeatherResponse(**item) for item in forecast_data])
