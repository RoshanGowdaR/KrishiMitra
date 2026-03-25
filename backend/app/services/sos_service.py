import json
from datetime import datetime
from typing import Any
from uuid import uuid4

import httpx  # noqa: F401
from fastapi import HTTPException

from app.config import get_settings
from app.services.gemini_client import gemini_client
from app.services.forum_service import create_post

SPECIALIZATIONS = {
    "crop_disease",
    "soil_health",
    "irrigation",
    "pest_control",
    "organic_farming",
    "market_advisory",
}

_DEFAULT_EXPERTS: list[dict[str, Any]] = [
    {
        "id": "exp-001",
        "name": "Dr. Shankar Rao",
        "specialization": "crop_disease",
        "state": "Karnataka",
        "district": "Hassan",
        "phone": "9876500001",
        "language": "kn",
        "rating": 4.8,
        "available": True,
        "is_remote": False,
        "experience_years": 12,
    },
    {
        "id": "exp-002",
        "name": "Ms. Aditi Kulkarni",
        "specialization": "pest_control",
        "state": "Maharashtra",
        "district": "Pune",
        "phone": "9876500002",
        "language": "mr",
        "rating": 4.7,
        "available": True,
        "is_remote": False,
        "experience_years": 10,
    },
    {
        "id": "exp-003",
        "name": "Mr. Gurpreet Singh",
        "specialization": "irrigation",
        "state": "Punjab",
        "district": "Ludhiana",
        "phone": "9876500003",
        "language": "pa",
        "rating": 4.6,
        "available": True,
        "is_remote": False,
        "experience_years": 9,
    },
    {
        "id": "exp-004",
        "name": "Dr. Neha Iyer",
        "specialization": "soil_health",
        "state": "Tamil Nadu",
        "district": "Coimbatore",
        "phone": "9876500004",
        "language": "ta",
        "rating": 4.9,
        "available": True,
        "is_remote": False,
        "experience_years": 14,
    },
    {
        "id": "exp-005",
        "name": "Mr. Vinay Reddy",
        "specialization": "market_advisory",
        "state": "Telangana",
        "district": "Warangal",
        "phone": "9876500005",
        "language": "te",
        "rating": 4.5,
        "available": True,
        "is_remote": True,
        "experience_years": 8,
    },
    {
        "id": "exp-006",
        "name": "Ms. Priya Sharma",
        "specialization": "crop_disease",
        "state": "Uttar Pradesh",
        "district": "Bareilly",
        "phone": "9876500006",
        "language": "hi",
        "rating": 4.7,
        "available": True,
        "is_remote": True,
        "experience_years": 11,
    },
]

_EXPERTS: list[dict[str, Any]] = [dict(item) for item in _DEFAULT_EXPERTS]
_SOS_REQUESTS: dict[str, dict[str, Any]] = {}

NEIGHBORING_DISTRICTS: dict[str, list[str]] = {
    "hassan": ["mysuru", "mandya", "chikkamagaluru"],
    "pune": ["satara", "ahmednagar", "solapur"],
    "ludhiana": ["patiala", "moga", "jalandhar"],
    "nashik": ["ahmednagar", "dhule", "jalgaon"],
    "coimbatore": ["tiruppur", "erode", "nilgiris"],
    "guntur": ["prakasam", "krishna", "palnadu"],
    "warangal": ["hanamkonda", "karimnagar", "khammam"],
    "bareilly": ["rampur", "pilibhit", "shahjahanpur"],
    "patna": ["nalanda", "vaishali", "bhojpur"],
    "jaipur": ["ajmer", "sikar", "alwar"],
}

AGRI_SHOPS: dict[tuple[str, str], list[dict[str, str]]] = {
    ("karnataka", "hassan"): [
        {
            "name": "Hassan Agro Inputs",
            "address": "B.M. Road, Hassan",
            "phone": "08172-220011",
            "district": "Hassan",
            "state": "Karnataka",
            "speciality": "Crop protection and seeds",
        }
    ],
    ("maharashtra", "pune"): [
        {
            "name": "Pune Krishi Mart",
            "address": "Shivajinagar, Pune",
            "phone": "020-24350011",
            "district": "Pune",
            "state": "Maharashtra",
            "speciality": "Fertilizers and drip systems",
        }
    ],
    ("telangana", "warangal"): [
        {
            "name": "Warangal Farm Care",
            "address": "Hanamkonda Main Road",
            "phone": "0870-2456789",
            "district": "Warangal",
            "state": "Telangana",
            "speciality": "Pesticides and micronutrients",
        }
    ],
}

KRISHI_KENDRAS: dict[tuple[str, str], list[dict[str, str]]] = {
    ("karnataka", "hassan"): [
        {
            "name": "KVK Hassan",
            "address": "Arujundahalli, Hassan",
            "phone": "08172-266144",
            "district": "Hassan",
            "timings": "10:00 AM - 5:00 PM",
        }
    ],
    ("maharashtra", "pune"): [
        {
            "name": "KVK Baramati",
            "address": "Baramati, Pune",
            "phone": "02112-244001",
            "district": "Pune",
            "timings": "10:00 AM - 5:00 PM",
        }
    ],
    ("telangana", "warangal"): [
        {
            "name": "KVK Warangal",
            "address": "Madikonda, Warangal",
            "phone": "0870-2577333",
            "district": "Warangal",
            "timings": "10:00 AM - 5:00 PM",
        }
    ],
}

HELPLINES = {
    "national": [
        {"name": "Kisan Call Center", "number": "1800-180-1551"},
        {"name": "PM-KISAN Helpline", "number": "155261"},
        {"name": "Soil Health Card Helpline", "number": "1800-180-1551"},
    ],
    "statewise": {
        "Karnataka": "080-22212818",
        "Maharashtra": "1800-233-4000",
        "Punjab": "1800-180-1551",
        "Tamil Nadu": "1800-425-4444",
        "Andhra Pradesh": "1800-425-5032",
        "Telangana": "1800-425-3555",
        "Uttar Pradesh": "1800-180-1551",
        "Bihar": "1800-345-6262",
        "Rajasthan": "1800-180-6127",
        "Gujarat": "1800-233-5500",
    },
}


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _normalize(text: str | None) -> str:
    return str(text or "").strip().lower()
def _parse_ai_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Gemini returned invalid JSON") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="Gemini returned invalid response")

    return payload


def _matches_specialization(expert: dict[str, Any], specialization: str | None) -> bool:
    if not specialization:
        return True
    return _normalize(expert["specialization"]) == _normalize(specialization)


async def get_experts(
    state: str | None = None,
    district: str | None = None,
    specialization: str | None = None,
) -> list[dict[str, Any]]:
    experts = [dict(item) for item in _EXPERTS]

    if state:
        experts = [item for item in experts if _normalize(item["state"]) == _normalize(state)]
    if district:
        experts = [item for item in experts if _normalize(item["district"]) == _normalize(district)]
    if specialization:
        experts = [
            item for item in experts if _normalize(item["specialization"]) == _normalize(specialization)
        ]

    return experts


async def get_expert_by_id(expert_id: str) -> dict[str, Any]:
    for expert in _EXPERTS:
        if expert["id"] == expert_id:
            return dict(expert)
    raise HTTPException(status_code=404, detail="Expert not found")


async def _ai_emergency_analysis(
    issue_type: str,
    description: str,
    image_base64: str,
) -> dict[str, Any]:
    settings = get_settings()
    fallback_key = getattr(settings, "gemini_api_key", "")
    if fallback_key and not gemini_client.keys:
        gemini_client.keys = [fallback_key]
        gemini_client.current_index = 0

    prompt = (
        "You are an emergency agricultural doctor for Indian farmers. Return ONLY valid JSON with keys: "
        "disease_identification, severity, medicine_name, dosage, application_instructions, "
        "action_plan_24hr, action_plan_48hr, action_plan_72hr, what_to_avoid. "
        f"Issue type: {issue_type}. Description: {description}."
    )

    generated = await gemini_client.generate(prompt, image_base64=image_base64)
    return _parse_ai_json(generated)


def _pick_level_1_expert(request_data: dict[str, Any]) -> dict[str, Any] | None:
    state = _normalize(request_data.get("state"))
    district = _normalize(request_data.get("district"))
    specialization = _normalize(request_data.get("issue_type"))

    for expert in _EXPERTS:
        if not expert["available"] or expert["is_remote"]:
            continue
        if _normalize(expert["state"]) != state or _normalize(expert["district"]) != district:
            continue
        if specialization and not _matches_specialization(expert, specialization):
            continue
        return expert
    return None


def _pick_level_2_expert(request_data: dict[str, Any]) -> dict[str, Any] | None:
    state = _normalize(request_data.get("state"))
    district = _normalize(request_data.get("district"))
    specialization = _normalize(request_data.get("issue_type"))

    neighbors = NEIGHBORING_DISTRICTS.get(district, [])
    for expert in _EXPERTS:
        if not expert["available"] or expert["is_remote"]:
            continue
        if _normalize(expert["state"]) != state:
            continue
        if _normalize(expert["district"]) not in neighbors:
            continue
        if specialization and not _matches_specialization(expert, specialization):
            continue
        return expert
    return None


def _pick_level_3_expert(request_data: dict[str, Any]) -> dict[str, Any] | None:
    specialization = _normalize(request_data.get("issue_type"))

    for expert in _EXPERTS:
        if not expert["available"] or not expert["is_remote"]:
            continue
        if specialization and not _matches_specialization(expert, specialization):
            continue
        return expert

    return None


async def create_sos_request(request_data: dict[str, Any]) -> dict[str, Any]:
    issue_type = _normalize(request_data.get("issue_type"))
    if issue_type and issue_type not in SPECIALIZATIONS:
        raise HTTPException(status_code=400, detail="Invalid issue type specialization")

    base_request = {
        "id": str(uuid4()),
        "farmer_name": str(request_data.get("farmer_name", "")).strip(),
        "phone": str(request_data.get("phone", "")).strip(),
        "state": str(request_data.get("state", "")).strip(),
        "district": str(request_data.get("district", "")).strip(),
        "issue_type": issue_type,
        "description": str(request_data.get("description", "")).strip(),
        "image_base64": str(request_data.get("image_base64", "")).strip(),
        "urgency": str(request_data.get("urgency", "high")).strip().lower(),
        "status": "pending",
        "assigned_expert": None,
        "fallback_level": 0,
        "ai_response": None,
        "callback_scheduled": False,
        "created_at": _now_iso(),
    }

    level_1 = _pick_level_1_expert(base_request)
    if level_1 is not None:
        base_request["status"] = "assigned"
        base_request["assigned_expert"] = dict(level_1)
        base_request["fallback_level"] = 1
        _SOS_REQUESTS[base_request["id"]] = base_request
        return base_request

    level_2 = _pick_level_2_expert(base_request)
    if level_2 is not None:
        base_request["status"] = "assigned"
        base_request["assigned_expert"] = dict(level_2)
        base_request["fallback_level"] = 2
        _SOS_REQUESTS[base_request["id"]] = base_request
        return base_request

    level_3 = _pick_level_3_expert(base_request)
    if level_3 is not None:
        expert_data = dict(level_3)
        expert_data["consultation_mode"] = "remote"
        base_request["status"] = "assigned"
        base_request["assigned_expert"] = expert_data
        base_request["fallback_level"] = 3
        _SOS_REQUESTS[base_request["id"]] = base_request
        return base_request

    ai_response = await _ai_emergency_analysis(
        issue_type=base_request["issue_type"],
        description=base_request["description"],
        image_base64=base_request["image_base64"],
    )

    shops = await get_agri_shops(base_request["state"], base_request["district"])
    callback_result = await schedule_expert_callback(base_request["id"], store=False)

    forum_post = await create_post(
        {
            "author_name": base_request["farmer_name"] or "Anonymous Farmer",
            "state": base_request["state"],
            "district": base_request["district"],
            "language": "en",
            "category": "crop_issues",
            "title": f"URGENT SOS: {base_request['issue_type']}",
            "content": base_request["description"] or "Emergency assistance requested",
            "image_base64": base_request["image_base64"],
        }
    )

    base_request["status"] = "ai_assisted"
    base_request["fallback_level"] = 4
    base_request["callback_scheduled"] = True
    base_request["ai_response"] = {
        **ai_response,
        "nearest_shops": shops,
        "callback_scheduled": callback_result["callback_scheduled"],
        "forum_post_id": forum_post["id"],
    }

    _SOS_REQUESTS[base_request["id"]] = base_request
    return base_request


async def get_sos_status(request_id: str) -> dict[str, Any]:
    request = _SOS_REQUESTS.get(request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="SOS request not found")
    return request


async def schedule_expert_callback(request_id: str, store: bool = True) -> dict[str, Any]:
    if not store:
        return {
            "request_id": request_id,
            "callback_scheduled": True,
            "message": "Expert callback queued",
        }

    request = _SOS_REQUESTS.get(request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="SOS request not found")

    request["callback_scheduled"] = True
    if request["status"] == "pending":
        request["status"] = "ai_assisted"

    return {
        "request_id": request_id,
        "callback_scheduled": True,
        "message": "Expert callback queued",
    }


async def get_agri_shops(state: str, district: str) -> list[dict[str, str]]:
    shops = AGRI_SHOPS.get((_normalize(state), _normalize(district)))
    if shops:
        return shops

    return [
        {
            "name": "District Agro Service Center",
            "address": f"Main Market, {district}",
            "phone": "1800-180-1551",
            "district": district,
            "state": state,
            "speciality": "General agri inputs",
        }
    ]


async def get_krishi_kendras(state: str, district: str) -> list[dict[str, str]]:
    kendras = KRISHI_KENDRAS.get((_normalize(state), _normalize(district)))
    if kendras:
        return kendras

    return [
        {
            "name": "Nearest Krishi Vigyan Kendra",
            "address": f"District HQ, {district}",
            "phone": "1800-180-1551",
            "district": district,
            "timings": "10:00 AM - 5:00 PM",
        }
    ]


async def get_helplines() -> dict[str, Any]:
    return HELPLINES


async def reset_sos_state() -> None:
    _SOS_REQUESTS.clear()
    _EXPERTS.clear()
    _EXPERTS.extend([dict(item) for item in _DEFAULT_EXPERTS])


async def set_expert_availability(expert_id: str, available: bool) -> None:
    for expert in _EXPERTS:
        if expert["id"] == expert_id:
            expert["available"] = available
            return
    raise HTTPException(status_code=404, detail="Expert not found")


async def add_expert(expert_data: dict[str, Any]) -> None:
    _EXPERTS.append(expert_data)
