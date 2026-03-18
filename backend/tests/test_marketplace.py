from fastapi.testclient import TestClient

from app.main import app
from app.services.marketplace_service import reset_marketplace_store

client = TestClient(app)


def _sample_listing_payload() -> dict:
    return {
        "farmer_name": "Ravi Kumar",
        "phone": "9876543210",
        "state": "Karnataka",
        "district": "Udupi",
        "commodity": "Rice",
        "variety": "Sona Masuri",
        "quantity_kg": 1200,
        "price_per_kg": 32.5,
        "description": "Freshly harvested rice",
        "available_from": "2026-03-20",
        "status": "active",
        "images_base64": ["aW1hZ2Ux"],
    }


def _create_listing() -> dict:
    response = client.post("/api/v1/marketplace/listings", json=_sample_listing_payload())
    assert response.status_code == 201
    return response.json()


def test_create_listing_returns_201_with_correct_fields() -> None:
    import asyncio

    asyncio.run(reset_marketplace_store())

    response = client.post("/api/v1/marketplace/listings", json=_sample_listing_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["farmer_name"] == "Ravi Kumar"
    assert body["commodity"] == "Rice"
    assert "id" in body
    assert "listing_date" in body


def test_get_listings_returns_list() -> None:
    import asyncio

    asyncio.run(reset_marketplace_store())
    _create_listing()

    response = client.get("/api/v1/marketplace/listings")

    assert response.status_code == 200
    assert isinstance(response.json()["listings"], list)
    assert len(response.json()["listings"]) >= 1


def test_filter_by_commodity_works() -> None:
    import asyncio

    asyncio.run(reset_marketplace_store())
    _create_listing()

    maize_payload = _sample_listing_payload()
    maize_payload["commodity"] = "Maize"
    client.post("/api/v1/marketplace/listings", json=maize_payload)

    response = client.get("/api/v1/marketplace/listings?commodity=Rice")

    assert response.status_code == 200
    listings = response.json()["listings"]
    assert len(listings) == 1
    assert listings[0]["commodity"] == "Rice"


def test_get_by_invalid_id_returns_404() -> None:
    response = client.get("/api/v1/marketplace/listings/invalid-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Listing not found"


def test_update_listing_works() -> None:
    import asyncio

    asyncio.run(reset_marketplace_store())
    created = _create_listing()

    response = client.put(
        f"/api/v1/marketplace/listings/{created['id']}",
        json={"price_per_kg": 35.0, "quantity_kg": 1100},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["price_per_kg"] == 35.0
    assert body["quantity_kg"] == 1100


def test_delete_listing_works() -> None:
    import asyncio

    asyncio.run(reset_marketplace_store())
    created = _create_listing()

    response = client.delete(f"/api/v1/marketplace/listings/{created['id']}")

    assert response.status_code == 200
    assert response.json()["message"] == "Listing deleted successfully"


def test_express_interest_returns_200() -> None:
    import asyncio

    asyncio.run(reset_marketplace_store())
    created = _create_listing()

    response = client.post(
        f"/api/v1/marketplace/listings/{created['id']}/interest",
        json={
            "buyer_name": "Suresh",
            "buyer_phone": "9123456780",
            "quantity_kg": 250,
            "message": "Need quick delivery",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "interest_sent"
    assert body["buyer_name"] == "Suresh"
