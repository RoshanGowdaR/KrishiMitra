from typing import Any

import httpx
from fastapi import HTTPException

from app.config import get_settings

DATA_GOV_MARKET_PRICES_URL = (
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
)


def _get_api_key() -> str:
    api_key = get_settings().data_gov_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="DATA_GOV_API_KEY is not configured",
        )
    return api_key


def _clean_price_record(record: dict[str, Any]) -> dict[str, Any]:
    min_price = record.get("min_price") or record.get("min price")
    max_price = record.get("max_price") or record.get("max price")
    modal_price = record.get("modal_price") or record.get("modal price")

    return {
        "state": record.get("state", ""),
        "district": record.get("district", ""),
        "market": record.get("market", ""),
        "commodity": record.get("commodity", ""),
        "variety": record.get("variety", ""),
        "min_price": str(min_price) if min_price is not None else "",
        "max_price": str(max_price) if max_price is not None else "",
        "modal_price": str(modal_price) if modal_price is not None else "",
        "date": record.get("arrival_date", ""),
    }


async def _fetch_market_records(
    state: str,
    district: str,
    commodity: str | None = None,
) -> list[dict[str, Any]]:
    params = {
        "api-key": _get_api_key(),
        "format": "json",
        "limit": 100,
        "filters[state]": state,
        "filters[district]": district,
    }
    if commodity:
        params["filters[commodity]"] = commodity

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(DATA_GOV_MARKET_PRICES_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail="data.gov.in returned an error",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach data.gov.in service",
        ) from exc

    records = payload.get("records", [])
    if not isinstance(records, list):
        raise HTTPException(status_code=502, detail="Invalid response from data.gov.in")

    return records


async def get_commodity_prices(
    state: str,
    district: str,
    commodity: str | None = None,
) -> list[dict[str, Any]]:
    records = await _fetch_market_records(state=state, district=district, commodity=commodity)
    cleaned_records = [_clean_price_record(record) for record in records]

    if commodity:
        cleaned_records = [
            record
            for record in cleaned_records
            if record["commodity"].strip().lower() == commodity.strip().lower()
        ]

    if not cleaned_records:
        raise HTTPException(
            status_code=404,
            detail="No market prices found for the provided filters",
        )

    return cleaned_records


async def get_available_commodities(state: str, district: str) -> list[str]:
    records = await _fetch_market_records(state=state, district=district)
    commodities = {
        str(record.get("commodity", "")).strip()
        for record in records
        if str(record.get("commodity", "")).strip()
    }
    return sorted(commodities)
