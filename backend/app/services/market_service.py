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
        "market": "APMC Bengaluru",
        "commodity": "Rice",
        "variety": "Sona Masuri",
        "min_price": 2100,
        "max_price": 2400,
        "modal_price": 2250,
        "date": "2026-03-22",
    },
    {
        "state": "Karnataka",
        "district": "Hassan",
        "market": "Hassan Mandi",
        "commodity": "Ragi",
        "variety": "Local",
        "min_price": 1800,
        "max_price": 2000,
        "modal_price": 1900,
        "date": "2026-03-22",
    },
    {
        "state": "Karnataka",
        "district": "Mysuru",
        "market": "Mysuru APMC",
        "commodity": "Tomato",
        "variety": "Hybrid",
        "min_price": 800,
        "max_price": 1200,
        "modal_price": 1000,
        "date": "2026-03-22",
    },
    {
        "state": "Maharashtra",
        "district": "Pune",
        "market": "Pune Mandi",
        "commodity": "Onion",
        "variety": "Red",
        "min_price": 1200,
        "max_price": 1500,
        "modal_price": 1350,
        "date": "2026-03-22",
    },
    {
        "state": "Punjab",
        "district": "Ludhiana",
        "market": "Ludhiana Mandi",
        "commodity": "Wheat",
        "variety": "HD-2967",
        "min_price": 2100,
        "max_price": 2300,
        "modal_price": 2200,
        "date": "2026-03-22",
    },
    {
        "state": "Tamil Nadu",
        "district": "Chennai",
        "market": "Koyambedu",
        "commodity": "Banana",
        "variety": "Robusta",
        "min_price": 1500,
        "max_price": 1800,
        "modal_price": 1650,
        "date": "2026-03-22",
    },
    {
        "state": "Andhra Pradesh",
        "district": "Guntur",
        "market": "Guntur Mandi",
        "commodity": "Chilli",
        "variety": "Teja",
        "min_price": 8000,
        "max_price": 9000,
        "modal_price": 8500,
        "date": "2026-03-22",
    },
    {
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "market": "Lucknow Mandi",
        "commodity": "Potato",
        "variety": "Jyoti",
        "min_price": 600,
        "max_price": 800,
        "modal_price": 700,
        "date": "2026-03-22",
    },
    {
        "state": "Rajasthan",
        "district": "Jaipur",
        "market": "Jaipur Mandi",
        "commodity": "Mustard",
        "variety": "RH-749",
        "min_price": 4500,
        "max_price": 5000,
        "modal_price": 4750,
        "date": "2026-03-22",
    },
    {
        "state": "Gujarat",
        "district": "Ahmedabad",
        "market": "Ahmedabad Mandi",
        "commodity": "Cotton",
        "variety": "Bt Cotton",
        "min_price": 5500,
        "max_price": 6000,
        "modal_price": 5750,
        "date": "2026-03-22",
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

    if not sheet_id or not sheets_api_key:
        logger.warning(
            "Google Sheets credentials missing (sheet_id=%s, api_key_present=%s). Using fallback market data.",
            bool(sheet_id),
            bool(sheets_api_key),
        )
        prices = list(FALLBACK_PRICES)
    else:
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
            prices = list(FALLBACK_PRICES)

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
