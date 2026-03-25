from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_all_schemes_returns_expected_fields() -> None:
    response = client.get("/api/v1/schemes")

    assert response.status_code == 200
    body = response.json()
    assert "schemes" in body
    assert len(body["schemes"]) >= 8

    first = body["schemes"][0]
    required_fields = {
        "id",
        "name",
        "description",
        "eligibility",
        "benefits",
        "application_process",
        "deadline",
        "ministry",
        "scheme_type",
    }
    assert required_fields.issubset(first.keys())


def test_get_scheme_by_valid_id_returns_200() -> None:
    response = client.get("/api/v1/schemes/pm-kisan")

    assert response.status_code == 200
    assert response.json()["id"] == "pm-kisan"


def test_get_scheme_by_invalid_id_returns_404() -> None:
    response = client.get("/api/v1/schemes/unknown-scheme")

    assert response.status_code == 404
    assert response.json()["detail"] == "Scheme not found"


def test_eligibility_check_returns_correct_result() -> None:
    payload = {
        "scheme_id": "pm-kisan",
        "language": "en",
        "farmer_profile": {
            "land_size": 2.5,
            "income": 180000,
            "category": "small",
        },
    }

    response = client.post("/api/v1/schemes/eligibility", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["scheme_id"] == "pm-kisan"
    assert body["is_eligible"] is True


def test_language_parameter_works() -> None:
    english = client.get("/api/v1/schemes/pm-kisan?language=en")
    hindi = client.get("/api/v1/schemes/pm-kisan?language=hi")

    assert english.status_code == 200
    assert hindi.status_code == 200
    assert english.json()["name"] != hindi.json()["name"]
