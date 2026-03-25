from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_all_crops_returns_list_with_correct_fields() -> None:
    response = client.get("/api/v1/farm-guide/crops?language=en")

    assert response.status_code == 200
    crops = response.json()["crops"]
    assert len(crops) >= 10
    required = {
        "name",
        "local_names",
        "category",
        "season",
        "states",
        "difficulty",
        "profit_potential",
        "water_requirement",
        "image_description",
    }
    assert required.issubset(crops[0].keys())


def test_filter_by_category_works() -> None:
    response = client.get("/api/v1/farm-guide/crops?language=en&category=cereal")

    assert response.status_code == 200
    crops = response.json()["crops"]
    assert len(crops) > 0
    assert all(item["category"] == "cereal" for item in crops)


def test_get_crop_guide_returns_all_sections() -> None:
    response = client.get("/api/v1/farm-guide/crops/rice?language=en")

    assert response.status_code == 200
    body = response.json()
    for section in [
        "overview",
        "soil_requirements",
        "planting",
        "irrigation",
        "fertilization",
        "pest_management",
        "disease_management",
        "harvesting",
        "post_harvest",
        "market_info",
    ]:
        assert section in body


def test_get_crop_guide_for_invalid_crop_returns_404() -> None:
    response = client.get("/api/v1/farm-guide/crops/dragonfruit?language=en")

    assert response.status_code == 404
    assert response.json()["detail"] == "Unsupported crop"


def test_seasonal_calendar_returns_correct_crops_for_month() -> None:
    response = client.get("/api/v1/farm-guide/seasonal-calendar?state=Karnataka&month=6")

    assert response.status_code == 200
    body = response.json()
    assert "rice" in body["crops_to_sow"]
    assert len(body["important_activities"]) > 0


def test_crop_comparison_returns_both_crops_data() -> None:
    response = client.get("/api/v1/farm-guide/compare?crop1=rice&crop2=wheat")

    assert response.status_code == 200
    body = response.json()
    assert body["crop1"]["name"] == "rice"
    assert body["crop2"]["name"] == "wheat"


def test_quick_tips_returns_exactly_5_tips() -> None:
    response = client.get("/api/v1/farm-guide/crops/rice/quick-tips?language=en")

    assert response.status_code == 200
    tips = response.json()["tips"]
    assert len(tips) == 5


def test_language_parameter_works() -> None:
    english = client.get("/api/v1/farm-guide/crops/rice?language=en")
    hindi = client.get("/api/v1/farm-guide/crops/rice?language=hi")

    assert english.status_code == 200
    assert hindi.status_code == 200
    assert english.json()["overview"]["description"] != hindi.json()["overview"]["description"]
