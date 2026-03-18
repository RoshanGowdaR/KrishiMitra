from datetime import date
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

_LISTINGS: dict[str, dict[str, Any]] = {}


def _normalize_listing_payload(listing_data: dict[str, Any]) -> dict[str, Any]:
    return {
        "farmer_name": str(listing_data.get("farmer_name", "")).strip(),
        "phone": str(listing_data.get("phone", "")).strip(),
        "state": str(listing_data.get("state", "")).strip(),
        "district": str(listing_data.get("district", "")).strip(),
        "commodity": str(listing_data.get("commodity", "")).strip(),
        "variety": str(listing_data.get("variety", "")).strip(),
        "quantity_kg": float(listing_data.get("quantity_kg", 0.0)),
        "price_per_kg": float(listing_data.get("price_per_kg", 0.0)),
        "description": str(listing_data.get("description", "")).strip(),
        "available_from": str(listing_data.get("available_from", "")).strip(),
        "status": str(listing_data.get("status", "active")).strip().lower() or "active",
        "images_base64": [str(item) for item in listing_data.get("images_base64", [])],
    }


async def create_listing(listing_data: dict[str, Any]) -> dict[str, Any]:
    normalized = _normalize_listing_payload(listing_data)
    listing_id = str(uuid4())
    listing = {
        "id": listing_id,
        **normalized,
        "listing_date": date.today().isoformat(),
    }
    _LISTINGS[listing_id] = listing
    return listing


async def get_listings(
    state: str | None = None,
    commodity: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
) -> list[dict[str, Any]]:
    listings = list(_LISTINGS.values())

    if state:
        target_state = state.strip().lower()
        listings = [item for item in listings if item["state"].strip().lower() == target_state]

    if commodity:
        target_commodity = commodity.strip().lower()
        listings = [
            item for item in listings if item["commodity"].strip().lower() == target_commodity
        ]

    if min_price is not None:
        listings = [item for item in listings if float(item["price_per_kg"]) >= min_price]

    if max_price is not None:
        listings = [item for item in listings if float(item["price_per_kg"]) <= max_price]

    return listings


async def get_listing_by_id(listing_id: str) -> dict[str, Any]:
    listing = _LISTINGS.get(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


async def update_listing(listing_id: str, data: dict[str, Any]) -> dict[str, Any]:
    existing = await get_listing_by_id(listing_id)
    updates = _normalize_listing_payload({**existing, **data})

    updated = {
        **existing,
        **updates,
    }
    _LISTINGS[listing_id] = updated
    return updated


async def delete_listing(listing_id: str) -> dict[str, str]:
    _ = await get_listing_by_id(listing_id)
    del _LISTINGS[listing_id]
    return {"message": "Listing deleted successfully"}


async def express_interest(listing_id: str, buyer_info: dict[str, Any]) -> dict[str, Any]:
    listing = await get_listing_by_id(listing_id)

    buyer_name = str(buyer_info.get("buyer_name", "")).strip()
    buyer_phone = str(buyer_info.get("buyer_phone", "")).strip()
    quantity_kg = float(buyer_info.get("quantity_kg", 0.0))
    message = str(buyer_info.get("message", "")).strip()

    return {
        "listing_id": listing_id,
        "farmer_name": listing["farmer_name"],
        "farmer_phone": listing["phone"],
        "buyer_name": buyer_name,
        "buyer_phone": buyer_phone,
        "quantity_kg": quantity_kg,
        "message": message,
        "status": "interest_sent",
    }


async def reset_marketplace_store() -> None:
    _LISTINGS.clear()
