import time
from typing import Any
import logging

import httpx

from app.config import get_settings

_cache: dict[str, list[dict[str, Any]]] = {}
_cache_time: dict[str, float] = {}
CACHE_TTL = 3600
logger = logging.getLogger(__name__)

FALLBACK_PRICES: list[dict[str, Any]] = [
    {
        "state": "Karnataka",
        "district": "Bengaluru",
        "market": "Yeshwanthpur",
        "commodity": "Tomato",
        "variety": "Local",
        "min_price": 1800.0,
        "max_price": 2400.0,
        "modal_price": 2100.0,
        "date": "22/03/2026",
    },
    {
        "state": "Karnataka",
        "district": "Mysuru",
        "market": "Mysuru",
        "commodity": "Onion",
        "variety": "Red",
        "min_price": 1400.0,
        "max_price": 1900.0,
        "modal_price": 1650.0,
        "date": "22/03/2026",
    },
    {
        "state": "Karnataka",
        "district": "Udupi",
        "market": "Udupi",
        "commodity": "Rice",
        "variety": "Sona",
        "min_price": 2500.0,
        "max_price": 2800.0,
        "modal_price": 2650.0,
        "date": "22/03/2026",
    },
]


def _apply_filters(
    prices: list[dict[str, Any]],
    state: str | None,
    district: str | None,
    commodity: str | None,
) -> list[dict[str, Any]]:
    filtered = list(prices)
    if state and state.lower() not in ("", "all"):
        filtered = [item for item in filtered if item["state"].lower() == state.lower()]

    if district and district.lower() not in ("", "all"):
        filtered = [item for item in filtered if item["district"].lower() == district.lower()]

    if commodity:
        filtered = [item for item in filtered if commodity.lower() in item["commodity"].lower()]

    return filtered


async def get_commodity_prices(
    state: str | None = None,
    district: str | None = None,
    commodity: str | None = None,
) -> list[dict[str, Any]]:
    settings = get_settings()
    sheet_id = getattr(settings, "google_sheet_id", "")
    sheets_api_key = getattr(settings, "google_sheets_api_key", "")

    cache_key = f"{state}_{district}_{commodity}"
    now = time.time()

    if cache_key in _cache and now - _cache_time.get(cache_key, 0) < CACHE_TTL:
        return _cache[cache_key]

    prices: list[dict[str, Any]] = []

    if sheet_id and sheets_api_key:
        try:
            url = (
                "https://sheets.googleapis.com/v4/spreadsheets"
                f"/{sheet_id}/values/Sheet1!A:I?key={sheets_api_key}"
            )
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

            rows = data.get("values", [])
            if rows and len(rows) >= 2:
                data_rows = rows[1:]
                for row in data_rows:
                    if len(row) < 9:
                        continue
                    try:
                        price_item = {
                            "state": row[0],
                            "district": row[1],
                            "market": row[2],
                            "commodity": row[3],
                            "variety": row[4],
                            "min_price": float(row[5]),
                            "max_price": float(row[6]),
                            "modal_price": float(row[7]),
                            "date": row[8],
                        }
                        prices.append(price_item)
                    except (ValueError, IndexError):
                        continue
        except Exception as exc:  # noqa: BLE001
            logger.exception("Google Sheets fetch failed: %s", exc)

    if not prices:
        logger.warning("Using fallback market prices data")
        prices = list(FALLBACK_PRICES)

    prices = _apply_filters(prices, state=state, district=district, commodity=commodity)

    _cache[cache_key] = prices
    _cache_time[cache_key] = now
    return prices


async def get_available_commodities(
    state: str | None = None,
    district: str | None = None,
) -> list[str]:
    prices = await get_commodity_prices(state, district)
    commodities = list(set(item["commodity"] for item in prices))
    return sorted(commodities)
