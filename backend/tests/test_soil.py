from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _soil_card_payload() -> dict:
    return {
        "pH": 6.8,
        "nitrogen": 300,
        "phosphorus": 30,
        "potassium": 320,
        "organic_carbon": 0.9,
        "micronutrients": {
            "zinc": 1.2,
            "boron": 0.6,
            "iron": 4.3,
        },
    }


def test_soil_card_analysis_returns_correct_health_status() -> None:
    response = client.post("/api/v1/soil/analyze-card", json=_soil_card_payload())

    assert response.status_code == 200
    assert response.json()["soil_health_status"] in {"good", "excellent"}


def test_soil_card_analysis_returns_crop_recommendations() -> None:
    response = client.post("/api/v1/soil/analyze-card", json=_soil_card_payload())

    assert response.status_code == 200
    crops = response.json()["crop_recommendations"]
    assert isinstance(crops, list)
    assert len(crops) > 0


def test_appearance_analysis_returns_estimated_soil_type() -> None:
    payload = {
        "soil_color": "black",
        "water_drainage": "moderate",
        "previous_crops": ["cotton", "soybean"],
        "state": "Karnataka",
        "district": "Hassan",
    }
    response = client.post("/api/v1/soil/analyze-appearance", json=payload)

    assert response.status_code == 200
    assert response.json()["estimated_soil_type"] == "Black cotton soil"


def test_location_analysis_returns_district_soil_data() -> None:
    response = client.get("/api/v1/soil/analyze-location?state=Karnataka&district=Hassan")

    assert response.status_code == 200
    body = response.json()
    assert body["typical_soil_type"] == "Red loamy soil"
    assert len(body["crops"]) > 0


def test_invalid_district_returns_helpful_fallback_response() -> None:
    response = client.get("/api/v1/soil/analyze-location?state=Karnataka&district=Unknown")

    assert response.status_code == 200
    body = response.json()
    assert "fallback" in body["note"].lower()


def test_card_guidance_returns_steps_and_documents() -> None:
    response = client.get("/api/v1/soil/card-guidance?state=Karnataka")

    assert response.status_code == 200
    body = response.json()
    assert len(body["steps"]) > 0
    assert len(body["required_documents"]) > 0


def test_cost_calculator_returns_all_cost_fields() -> None:
    payload = {"crop": "rice", "area_acres": 2.0, "soil_health": "moderate"}
    response = client.post("/api/v1/soil/cost-calculator", json=payload)

    assert response.status_code == 200
    body = response.json()
    for key in [
        "seeds_cost",
        "fertilizer_cost",
        "pesticide_cost",
        "irrigation_cost",
        "labor_cost",
        "total_cost",
    ]:
        assert key in body


def test_cost_calculator_with_invalid_crop_returns_404() -> None:
    payload = {"crop": "dragonfruit", "area_acres": 2.0, "soil_health": "moderate"}
    response = client.post("/api/v1/soil/cost-calculator", json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "Unsupported crop"


def test_cost_calculator_with_negative_area_returns_400() -> None:
    payload = {"crop": "rice", "area_acres": -1.0, "soil_health": "moderate"}
    response = client.post("/api/v1/soil/cost-calculator", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Area acres must be greater than zero"


def test_crop_requirements_returns_correct_data() -> None:
    response = client.get("/api/v1/soil/crop-requirements/rice")

    assert response.status_code == 200
    body = response.json()
    assert body["crop"] == "rice"
    assert "ideal_ph" in body


def test_supported_crops_returns_full_list() -> None:
    response = client.get("/api/v1/soil/supported-crops")

    assert response.status_code == 200
    crops = response.json()["crops"]
    assert len(crops) == 10
