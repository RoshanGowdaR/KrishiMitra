from typing import Any

from fastapi import HTTPException

SUPPORTED_CROPS = [
    "rice",
    "wheat",
    "maize",
    "sugarcane",
    "cotton",
    "ragi",
    "soybean",
    "tomato",
    "onion",
    "potato",
]

LOCATION_SOIL_DATA: dict[tuple[str, str], dict[str, Any]] = {
    ("karnataka", "hassan"): {
        "soil_type": "Red loamy soil",
        "best_crops": ["coffee", "maize", "ragi", "paddy"],
        "fertilizer_recommendations": [
            {"type": "NPK 20:20:0", "quantity": "100 kg/acre"},
            {"type": "Farmyard manure", "quantity": "2 tons/acre"},
        ],
    },
    ("maharashtra", "pune"): {
        "soil_type": "Medium black soil",
        "best_crops": ["sugarcane", "onion", "wheat", "soybean"],
        "fertilizer_recommendations": [
            {"type": "Urea", "quantity": "80 kg/acre"},
            {"type": "DAP", "quantity": "50 kg/acre"},
        ],
    },
    ("punjab", "ludhiana"): {
        "soil_type": "Alluvial soil",
        "best_crops": ["wheat", "rice", "maize"],
        "fertilizer_recommendations": [
            {"type": "NPK 12:32:16", "quantity": "70 kg/acre"},
            {"type": "Zinc sulfate", "quantity": "10 kg/acre"},
        ],
    },
    ("maharashtra", "nashik"): {
        "soil_type": "Black cotton soil",
        "best_crops": ["onion", "grapes", "tomato", "soybean"],
        "fertilizer_recommendations": [
            {"type": "Compost", "quantity": "1.5 tons/acre"},
            {"type": "NPK 19:19:19", "quantity": "60 kg/acre"},
        ],
    },
    ("tamil nadu", "coimbatore"): {
        "soil_type": "Red sandy loam",
        "best_crops": ["cotton", "maize", "sorghum", "vegetables"],
        "fertilizer_recommendations": [
            {"type": "NPK 17:17:17", "quantity": "75 kg/acre"},
            {"type": "Gypsum", "quantity": "100 kg/acre"},
        ],
    },
    ("andhra pradesh", "guntur"): {
        "soil_type": "Black clay soil",
        "best_crops": ["chilli", "cotton", "turmeric", "paddy"],
        "fertilizer_recommendations": [
            {"type": "Potash", "quantity": "40 kg/acre"},
            {"type": "Organic compost", "quantity": "2 tons/acre"},
        ],
    },
    ("telangana", "warangal"): {
        "soil_type": "Red sandy soil",
        "best_crops": ["cotton", "rice", "maize", "pulses"],
        "fertilizer_recommendations": [
            {"type": "Urea", "quantity": "70 kg/acre"},
            {"type": "DAP", "quantity": "45 kg/acre"},
        ],
    },
    ("uttar pradesh", "bareilly"): {
        "soil_type": "Gangetic alluvial soil",
        "best_crops": ["wheat", "sugarcane", "paddy", "potato"],
        "fertilizer_recommendations": [
            {"type": "NPK 10:26:26", "quantity": "65 kg/acre"},
            {"type": "Farmyard manure", "quantity": "1.5 tons/acre"},
        ],
    },
    ("bihar", "patna"): {
        "soil_type": "Alluvial loam",
        "best_crops": ["rice", "wheat", "maize", "vegetables"],
        "fertilizer_recommendations": [
            {"type": "Urea", "quantity": "75 kg/acre"},
            {"type": "DAP", "quantity": "50 kg/acre"},
        ],
    },
    ("rajasthan", "jaipur"): {
        "soil_type": "Sandy loam",
        "best_crops": ["mustard", "wheat", "millets", "cumin"],
        "fertilizer_recommendations": [
            {"type": "NPK 15:15:15", "quantity": "55 kg/acre"},
            {"type": "Organic manure", "quantity": "1 ton/acre"},
        ],
    },
}

CROP_SOIL_REQUIREMENTS: dict[str, dict[str, Any]] = {
    "rice": {
        "ideal_ph": "5.5 - 6.5",
        "soil_types": ["Clay loam", "Alluvial"],
        "drainage": "Moderate to poor",
        "notes": "Requires standing water during key growth stages.",
    },
    "wheat": {
        "ideal_ph": "6.0 - 7.5",
        "soil_types": ["Loam", "Alluvial"],
        "drainage": "Well drained",
        "notes": "Responds well to balanced NPK and timely irrigation.",
    },
    "maize": {
        "ideal_ph": "5.8 - 7.0",
        "soil_types": ["Sandy loam", "Loam"],
        "drainage": "Well drained",
        "notes": "Avoid waterlogging; ensure nitrogen split doses.",
    },
    "sugarcane": {
        "ideal_ph": "6.0 - 7.8",
        "soil_types": ["Deep loam", "Black soil"],
        "drainage": "Moderate",
        "notes": "High nutrient demand crop with long duration.",
    },
    "cotton": {
        "ideal_ph": "6.0 - 8.0",
        "soil_types": ["Black cotton soil", "Loamy"],
        "drainage": "Well drained",
        "notes": "Performs well in moisture retentive soils.",
    },
    "ragi": {
        "ideal_ph": "5.0 - 7.5",
        "soil_types": ["Red loam", "Sandy loam"],
        "drainage": "Moderate",
        "notes": "Suitable for rainfed and marginal lands.",
    },
    "soybean": {
        "ideal_ph": "6.0 - 7.5",
        "soil_types": ["Black soil", "Loam"],
        "drainage": "Well drained",
        "notes": "Sensitive to waterlogging during early growth.",
    },
    "tomato": {
        "ideal_ph": "6.0 - 7.0",
        "soil_types": ["Sandy loam", "Loam"],
        "drainage": "Well drained",
        "notes": "Needs consistent moisture and micronutrient support.",
    },
    "onion": {
        "ideal_ph": "6.0 - 7.5",
        "soil_types": ["Loam", "Sandy loam"],
        "drainage": "Well drained",
        "notes": "Avoid heavy waterlogging; sulfur helps bulb quality.",
    },
    "potato": {
        "ideal_ph": "5.2 - 6.4",
        "soil_types": ["Sandy loam", "Loam"],
        "drainage": "Well drained",
        "notes": "Loose soil supports tuber development.",
    },
}

CROP_COST_BASE: dict[str, dict[str, float]] = {
    "rice": {
        "seeds": 1800,
        "fertilizer": 3200,
        "pesticide": 1600,
        "irrigation": 2200,
        "labor": 4500,
        "yield_min": 1800,
        "yield_max": 2400,
        "price_min": 18,
        "price_max": 24,
    },
    "wheat": {
        "seeds": 1500,
        "fertilizer": 2800,
        "pesticide": 1200,
        "irrigation": 1800,
        "labor": 3800,
        "yield_min": 1400,
        "yield_max": 2000,
        "price_min": 20,
        "price_max": 26,
    },
    "maize": {
        "seeds": 2000,
        "fertilizer": 2600,
        "pesticide": 1400,
        "irrigation": 1600,
        "labor": 3500,
        "yield_min": 1600,
        "yield_max": 2200,
        "price_min": 17,
        "price_max": 23,
    },
    "sugarcane": {
        "seeds": 5500,
        "fertilizer": 4800,
        "pesticide": 2200,
        "irrigation": 3800,
        "labor": 7000,
        "yield_min": 28000,
        "yield_max": 36000,
        "price_min": 3,
        "price_max": 4,
    },
    "cotton": {
        "seeds": 2800,
        "fertilizer": 3600,
        "pesticide": 3000,
        "irrigation": 2200,
        "labor": 5200,
        "yield_min": 700,
        "yield_max": 1100,
        "price_min": 55,
        "price_max": 75,
    },
    "ragi": {
        "seeds": 1200,
        "fertilizer": 2000,
        "pesticide": 900,
        "irrigation": 1200,
        "labor": 3000,
        "yield_min": 900,
        "yield_max": 1400,
        "price_min": 24,
        "price_max": 32,
    },
    "soybean": {
        "seeds": 1900,
        "fertilizer": 2500,
        "pesticide": 1300,
        "irrigation": 1400,
        "labor": 3200,
        "yield_min": 900,
        "yield_max": 1400,
        "price_min": 38,
        "price_max": 52,
    },
    "tomato": {
        "seeds": 2600,
        "fertilizer": 4200,
        "pesticide": 3200,
        "irrigation": 2400,
        "labor": 6200,
        "yield_min": 6000,
        "yield_max": 9000,
        "price_min": 8,
        "price_max": 16,
    },
    "onion": {
        "seeds": 2100,
        "fertilizer": 3400,
        "pesticide": 2100,
        "irrigation": 2100,
        "labor": 5000,
        "yield_min": 5000,
        "yield_max": 7600,
        "price_min": 10,
        "price_max": 20,
    },
    "potato": {
        "seeds": 4200,
        "fertilizer": 3900,
        "pesticide": 2200,
        "irrigation": 2000,
        "labor": 4800,
        "yield_min": 6000,
        "yield_max": 9000,
        "price_min": 9,
        "price_max": 16,
    },
}


def _soil_health_score(soil_data: dict[str, Any]) -> float:
    ph = float(soil_data["pH"])
    nitrogen = float(soil_data["nitrogen"])
    phosphorus = float(soil_data["phosphorus"])
    potassium = float(soil_data["potassium"])
    organic_carbon = float(soil_data["organic_carbon"])

    score = 0.0
    score += 25 if 6.0 <= ph <= 7.5 else 12
    score += 20 if nitrogen >= 280 else 10
    score += 20 if phosphorus >= 22 else 10
    score += 20 if potassium >= 280 else 10
    score += 15 if organic_carbon >= 0.75 else 7
    return score


def _score_to_status(score: float) -> str:
    if score < 40:
        return "poor"
    if score < 65:
        return "moderate"
    if score < 85:
        return "good"
    return "excellent"


def _recommend_crops_from_ph(ph: float) -> list[str]:
    if ph < 6.0:
        return ["rice", "potato", "tea", "tomato"]
    if ph <= 7.5:
        return ["rice", "wheat", "maize", "soybean", "cotton"]
    return ["barley", "mustard", "cotton", "sorghum"]


def _fertilizer_plan(soil_data: dict[str, Any]) -> list[dict[str, str]]:
    recommendations: list[dict[str, str]] = []

    if float(soil_data["nitrogen"]) < 280:
        recommendations.append({"type": "Urea", "quantity": "50 kg/acre"})
    else:
        recommendations.append({"type": "Urea", "quantity": "25 kg/acre"})

    if float(soil_data["phosphorus"]) < 22:
        recommendations.append({"type": "DAP", "quantity": "40 kg/acre"})
    else:
        recommendations.append({"type": "DAP", "quantity": "20 kg/acre"})

    if float(soil_data["potassium"]) < 280:
        recommendations.append({"type": "MOP", "quantity": "25 kg/acre"})
    else:
        recommendations.append({"type": "MOP", "quantity": "10 kg/acre"})

    recommendations.append({"type": "Organic compost", "quantity": "1.5 tons/acre"})
    return recommendations


async def analyze_soil_card(soil_data: dict[str, Any]) -> dict[str, Any]:
    ph = float(soil_data.get("pH", 0))
    if ph < 0 or ph > 14:
        raise HTTPException(status_code=400, detail="Invalid pH value. It must be between 0 and 14")

    score = _soil_health_score(soil_data)
    status = _score_to_status(score)

    return {
        "soil_health_status": status,
        "crop_recommendations": _recommend_crops_from_ph(ph),
        "fertilizer_recommendations": _fertilizer_plan(soil_data),
    }


async def analyze_soil_by_appearance(appearance_data: dict[str, Any]) -> dict[str, Any]:
    soil_color = str(appearance_data.get("soil_color", "")).strip().lower()
    drainage = str(appearance_data.get("water_drainage", "")).strip().lower()
    previous_crops = [str(item).strip().lower() for item in appearance_data.get("previous_crops", [])]

    if soil_color == "black":
        estimated_soil_type = "Black cotton soil"
        crops = ["cotton", "soybean", "sorghum"]
    elif soil_color == "red":
        estimated_soil_type = "Red loamy soil"
        crops = ["ragi", "groundnut", "maize"]
    elif soil_color == "brown":
        estimated_soil_type = "Alluvial loam"
        crops = ["wheat", "rice", "vegetables"]
    else:
        estimated_soil_type = "Sandy loam"
        crops = ["groundnut", "millets", "onion"]

    confidence = "medium"
    if drainage in {"moderate", "slow"} and previous_crops:
        confidence = "high"
    if drainage == "fast" and not previous_crops:
        confidence = "low"

    estimated_health = "moderate"
    if drainage == "moderate" and len(previous_crops) >= 2:
        estimated_health = "good"
    if drainage == "slow" and soil_color == "black":
        estimated_health = "excellent"

    return {
        "estimated_soil_type": estimated_soil_type,
        "estimated_soil_health": estimated_health,
        "crop_recommendations": crops,
        "confidence_level": confidence,
    }


async def analyze_soil_by_location(state: str, district: str) -> dict[str, Any]:
    key = (state.strip().lower(), district.strip().lower())
    data = LOCATION_SOIL_DATA.get(key)

    if data is None:
        return {
            "state": state,
            "district": district,
            "typical_soil_type": "Data not available for this district yet",
            "crops": ["rice", "wheat", "maize"],
            "fertilizer_recommendations": [
                {"type": "NPK balanced fertilizer", "quantity": "60 kg/acre"},
                {"type": "Organic compost", "quantity": "1 ton/acre"},
            ],
            "note": "Showing fallback recommendations. Please consult local Krishi Vigyan Kendra.",
        }

    return {
        "state": state,
        "district": district,
        "typical_soil_type": data["soil_type"],
        "crops": data["best_crops"],
        "fertilizer_recommendations": data["fertilizer_recommendations"],
        "note": "District-level recommendation based on typical regional soil profile.",
    }


async def get_soil_card_guidance(state: str | None = None) -> dict[str, Any]:
    helpline_numbers = ["1800-180-1551", "1800-121-4040"]
    if state and state.strip().lower() == "karnataka":
        helpline_numbers.append("080-2338-1234")

    return {
        "steps": [
            "Visit the nearest Krishi Vigyan Kendra or Agriculture Department office.",
            "Collect soil sample bags and sampling instructions.",
            "Take representative soil samples from 5-10 points in your field.",
            "Submit samples with farmer details and land information.",
            "Collect Soil Health Card report and discuss recommendations with extension officer.",
        ],
        "required_documents": [
            "Aadhaar card",
            "Land record or tenancy proof",
            "Mobile number",
            "Bank passbook copy (if required by local office)",
        ],
        "helpline_numbers": helpline_numbers,
    }


async def calculate_input_cost(
    crop: str,
    area_acres: float,
    soil_health: str = "moderate",
) -> dict[str, Any]:
    if area_acres <= 0:
        raise HTTPException(status_code=400, detail="Area acres must be greater than zero")

    crop_key = crop.strip().lower()
    if crop_key not in CROP_COST_BASE:
        raise HTTPException(status_code=404, detail="Unsupported crop")

    multiplier = area_acres
    health_factor = {
        "poor": 1.15,
        "moderate": 1.0,
        "good": 0.95,
        "excellent": 0.9,
    }.get(soil_health.strip().lower(), 1.0)

    base = CROP_COST_BASE[crop_key]

    seeds_cost = round(base["seeds"] * multiplier, 2)
    fertilizer_cost = round(base["fertilizer"] * multiplier * health_factor, 2)
    pesticide_cost = round(base["pesticide"] * multiplier, 2)
    irrigation_cost = round(base["irrigation"] * multiplier, 2)
    labor_cost = round(base["labor"] * multiplier, 2)
    total_cost = round(
        seeds_cost + fertilizer_cost + pesticide_cost + irrigation_cost + labor_cost,
        2,
    )

    expected_yield_min = round(base["yield_min"] * multiplier, 2)
    expected_yield_max = round(base["yield_max"] * multiplier, 2)

    expected_revenue_min = expected_yield_min * base["price_min"]
    expected_revenue_max = expected_yield_max * base["price_max"]

    expected_profit_min = round(expected_revenue_min - total_cost, 2)
    expected_profit_max = round(expected_revenue_max - total_cost, 2)

    return {
        "crop": crop_key,
        "area_acres": area_acres,
        "soil_health": soil_health,
        "seeds_cost": seeds_cost,
        "fertilizer_cost": fertilizer_cost,
        "pesticide_cost": pesticide_cost,
        "irrigation_cost": irrigation_cost,
        "labor_cost": labor_cost,
        "total_cost": total_cost,
        "expected_yield_range": {
            "min_kg": expected_yield_min,
            "max_kg": expected_yield_max,
        },
        "expected_profit_range": {
            "min_inr": expected_profit_min,
            "max_inr": expected_profit_max,
        },
    }


async def get_crop_soil_requirements(crop: str) -> dict[str, Any]:
    crop_key = crop.strip().lower()
    requirements = CROP_SOIL_REQUIREMENTS.get(crop_key)
    if requirements is None:
        raise HTTPException(status_code=404, detail="Unsupported crop")

    return {
        "crop": crop_key,
        **requirements,
    }
