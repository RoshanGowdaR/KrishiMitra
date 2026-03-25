from copy import deepcopy
from typing import Any

from fastapi import HTTPException

SUPPORTED_CROPS = [
    "rice",
    "wheat",
    "maize",
    "tomato",
    "onion",
    "potato",
    "cotton",
    "sugarcane",
    "ragi",
    "soybean",
]

CROP_GUIDES_EN: dict[str, dict[str, Any]] = {
    "rice": {
        "name": "rice",
        "local_names": ["Paddy", "Dhaan", "Akki"],
        "category": "cereal",
        "season": "kharif",
        "states": ["Karnataka", "Punjab", "West Bengal", "Bihar", "Andhra Pradesh"],
        "difficulty": "medium",
        "profit_potential": "medium",
        "water_requirement": "high",
        "image_description": "Lush green paddy field with standing water",
        "overview": {
            "description": "Rice is a staple cereal crop cultivated in irrigated and rainfed ecosystems.",
            "origin": "South and Southeast Asia",
            "climate": "Warm and humid",
            "season": "Kharif",
        },
        "soil_requirements": {
            "type": "Clay loam to alluvial",
            "pH": "5.5 to 6.5",
            "drainage": "Moderate to poor",
            "preparation": "Puddling and leveling before transplanting",
        },
        "planting": {
            "seed_rate": "8 to 12 kg/acre for transplanting",
            "spacing": "20 x 15 cm",
            "depth": "2 to 3 cm",
            "method": "Nursery raising and transplanting",
        },
        "irrigation": {
            "frequency": "Every 5 to 7 days after establishment",
            "method": "Flood irrigation",
            "critical_stages": "Tillering, panicle initiation, flowering",
            "water_need": "1200 to 1600 mm",
        },
        "fertilization": {
            "base_dose": "NPK 40:20:20 kg/acre",
            "top_dress": "Split nitrogen at tillering and panicle initiation",
            "micronutrients": "Zinc sulfate if deficiency observed",
            "schedule": "Basal plus 2 top dressings",
        },
        "pest_management": {
            "common_pests": ["Stem borer", "Brown planthopper", "Leaf folder"],
            "symptoms": ["Dead hearts", "Hopper burn", "Folded leaves"],
            "treatment": ["Need-based insecticide spray", "Pheromone traps"],
            "prevention": ["Balanced fertilization", "Field scouting", "Resistant varieties"],
        },
        "disease_management": {
            "common_diseases": ["Blast", "Bacterial leaf blight", "Sheath blight"],
            "symptoms": ["Leaf lesions", "Drying of leaf tips", "Sheath rot"],
            "treatment": ["Recommended fungicide/bactericide sprays", "Seed treatment"],
        },
        "harvesting": {
            "maturity_days": "110 to 140 days",
            "indicators": "Panicles turn golden yellow and grains harden",
            "method": "Manual or combine harvesting",
            "yield_per_acre": "18 to 24 quintals",
        },
        "post_harvest": {
            "storage": "Dry grain to 12 to 14 percent moisture",
            "processing": "Threshing, drying, milling",
            "shelf_life": "6 to 12 months",
        },
        "market_info": {
            "best_selling_months": ["October", "November", "December"],
            "price_range": "INR 1800 to 2600 per quintal",
            "major_markets": ["Raichur", "Ludhiana", "Kolkata", "Guntur"],
        },
        "quick_tips": [
            "Use healthy seedlings of 20 to 25 days age.",
            "Avoid excess nitrogen to reduce pest outbreaks.",
            "Maintain shallow water after transplanting.",
            "Scout field weekly for hopper and stem borer.",
            "Harvest at physiological maturity for better grain quality.",
        ],
    },
    "wheat": {
        "name": "wheat",
        "local_names": ["Gehu", "Godhi"],
        "category": "cereal",
        "season": "rabi",
        "states": ["Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh", "Bihar"],
        "difficulty": "easy",
        "profit_potential": "medium",
        "water_requirement": "medium",
        "image_description": "Golden wheat spikes ready for harvest",
        "overview": {
            "description": "Wheat is a major rabi cereal crop grown in cool and dry weather.",
            "origin": "Fertile Crescent",
            "climate": "Cool during growth and warm at maturity",
            "season": "Rabi",
        },
        "soil_requirements": {
            "type": "Loam to alluvial",
            "pH": "6.0 to 7.5",
            "drainage": "Well drained",
            "preparation": "Fine seedbed with 2 to 3 tillage operations",
        },
        "planting": {
            "seed_rate": "40 to 50 kg/acre",
            "spacing": "20 to 22.5 cm row spacing",
            "depth": "4 to 5 cm",
            "method": "Line sowing with seed drill",
        },
        "irrigation": {
            "frequency": "4 to 6 irrigations in season",
            "method": "Furrow or sprinkler",
            "critical_stages": "CRI, tillering, flowering, grain filling",
            "water_need": "450 to 650 mm",
        },
        "fertilization": {
            "base_dose": "NPK 50:25:20 kg/acre",
            "top_dress": "Split nitrogen at CRI and first node",
            "micronutrients": "Zinc and sulfur where deficient",
            "schedule": "Basal plus 2 splits",
        },
        "pest_management": {
            "common_pests": ["Aphids", "Termites"],
            "symptoms": ["Sucking damage", "Plant wilting patches"],
            "treatment": ["Recommended insecticide as needed"],
            "prevention": ["Timely sowing", "Seed treatment"],
        },
        "disease_management": {
            "common_diseases": ["Rust", "Loose smut"],
            "symptoms": ["Rusty pustules", "Black powdery spikes"],
            "treatment": ["Fungicide spray and resistant varieties"],
        },
        "harvesting": {
            "maturity_days": "110 to 130 days",
            "indicators": "Hard grains and dry straw",
            "method": "Combine or manual harvest",
            "yield_per_acre": "14 to 20 quintals",
        },
        "post_harvest": {
            "storage": "Store at safe moisture below 12 percent",
            "processing": "Cleaning and grading",
            "shelf_life": "8 to 12 months",
        },
        "market_info": {
            "best_selling_months": ["April", "May", "June"],
            "price_range": "INR 2000 to 2800 per quintal",
            "major_markets": ["Ludhiana", "Karnal", "Kanpur"],
        },
        "quick_tips": [
            "Sow at optimum window for your region.",
            "Irrigate at CRI stage without fail.",
            "Use certified and treated seed.",
            "Monitor rust incidence from boot stage.",
            "Avoid lodging by balanced nitrogen use.",
        ],
    },
    "maize": {
        "name": "maize",
        "local_names": ["Makka", "Makka Jola"],
        "category": "cereal",
        "season": "kharif",
        "states": ["Karnataka", "Madhya Pradesh", "Maharashtra", "Bihar", "Telangana"],
        "difficulty": "medium",
        "profit_potential": "medium",
        "water_requirement": "medium",
        "image_description": "Green maize field with developed cobs",
    },
    "tomato": {
        "name": "tomato",
        "local_names": ["Tamatar", "Tomate"],
        "category": "vegetable",
        "season": "all_season",
        "states": ["Karnataka", "Maharashtra", "Andhra Pradesh", "Madhya Pradesh"],
        "difficulty": "hard",
        "profit_potential": "high",
        "water_requirement": "medium",
        "image_description": "Tomato plants with red ripe fruits",
    },
    "onion": {
        "name": "onion",
        "local_names": ["Pyaz", "Eerulli"],
        "category": "vegetable",
        "season": "rabi",
        "states": ["Maharashtra", "Karnataka", "Madhya Pradesh", "Gujarat"],
        "difficulty": "medium",
        "profit_potential": "high",
        "water_requirement": "medium",
        "image_description": "Onion bulbs harvested and dried in field",
    },
    "potato": {
        "name": "potato",
        "local_names": ["Aloo", "Batata"],
        "category": "tuber",
        "season": "rabi",
        "states": ["Uttar Pradesh", "West Bengal", "Bihar", "Punjab"],
        "difficulty": "medium",
        "profit_potential": "medium",
        "water_requirement": "medium",
        "image_description": "Potato tubers lifted from loose soil",
    },
    "cotton": {
        "name": "cotton",
        "local_names": ["Kapas", "Hatti"],
        "category": "fiber",
        "season": "kharif",
        "states": ["Maharashtra", "Gujarat", "Telangana", "Punjab"],
        "difficulty": "hard",
        "profit_potential": "high",
        "water_requirement": "medium",
        "image_description": "Cotton bolls open on mature plants",
    },
    "sugarcane": {
        "name": "sugarcane",
        "local_names": ["Ganna", "Kabbu"],
        "category": "cash_crop",
        "season": "annual",
        "states": ["Uttar Pradesh", "Maharashtra", "Karnataka", "Tamil Nadu"],
        "difficulty": "hard",
        "profit_potential": "high",
        "water_requirement": "high",
        "image_description": "Tall sugarcane canes ready for harvest",
    },
    "ragi": {
        "name": "ragi",
        "local_names": ["Finger millet", "Nachni"],
        "category": "millet",
        "season": "kharif",
        "states": ["Karnataka", "Tamil Nadu", "Andhra Pradesh", "Odisha"],
        "difficulty": "easy",
        "profit_potential": "medium",
        "water_requirement": "low",
        "image_description": "Finger millet earheads in dryland field",
    },
    "soybean": {
        "name": "soybean",
        "local_names": ["Soyabean", "Bhat"],
        "category": "oilseed",
        "season": "kharif",
        "states": ["Madhya Pradesh", "Maharashtra", "Rajasthan", "Karnataka"],
        "difficulty": "medium",
        "profit_potential": "medium",
        "water_requirement": "medium",
        "image_description": "Soybean pods maturing on plants",
    },
}

# Fill compact guides for crops not explicitly expanded above.
for crop_name in [
    "maize",
    "tomato",
    "onion",
    "potato",
    "cotton",
    "sugarcane",
    "ragi",
    "soybean",
]:
    if "overview" not in CROP_GUIDES_EN[crop_name]:
        CROP_GUIDES_EN[crop_name].update(
            {
                "overview": {
                    "description": f"{crop_name.title()} is an important crop for Indian farmers.",
                    "origin": "Widely cultivated globally",
                    "climate": "Region specific moderate climate",
                    "season": CROP_GUIDES_EN[crop_name]["season"],
                },
                "soil_requirements": {
                    "type": "Loam to sandy loam",
                    "pH": "6.0 to 7.5",
                    "drainage": "Well drained",
                    "preparation": "Deep ploughing and fine tilth preparation",
                },
                "planting": {
                    "seed_rate": "As per local recommendation",
                    "spacing": "Crop specific spacing",
                    "depth": "2 to 5 cm",
                    "method": "Line sowing or transplanting",
                },
                "irrigation": {
                    "frequency": "At crop critical stages",
                    "method": "Furrow, drip or sprinkler",
                    "critical_stages": "Flowering and fruit/grain development",
                    "water_need": "Moderate",
                },
                "fertilization": {
                    "base_dose": "Balanced NPK basal dose",
                    "top_dress": "Split nitrogen application",
                    "micronutrients": "Apply based on soil test",
                    "schedule": "Basal plus stage-wise top dressing",
                },
                "pest_management": {
                    "common_pests": ["Aphids", "Borers", "Sucking pests"],
                    "symptoms": ["Leaf curling", "Holes", "Stunted growth"],
                    "treatment": ["Need-based sprays and traps"],
                    "prevention": ["Field monitoring", "Crop rotation"],
                },
                "disease_management": {
                    "common_diseases": ["Leaf spot", "Wilt"],
                    "symptoms": ["Spots and yellowing", "Wilting"],
                    "treatment": ["Recommended fungicide and sanitation"],
                },
                "harvesting": {
                    "maturity_days": "90 to 180 days depending on crop",
                    "indicators": "Physiological maturity indicators",
                    "method": "Manual or mechanized",
                    "yield_per_acre": "Varies by crop and management",
                },
                "post_harvest": {
                    "storage": "Cool dry storage with grading",
                    "processing": "Cleaning, grading and packing",
                    "shelf_life": "Varies by commodity",
                },
                "market_info": {
                    "best_selling_months": ["Seasonal peak months"],
                    "price_range": "Market dependent",
                    "major_markets": ["Local mandi", "Regional APMC"],
                },
                "quick_tips": [
                    "Choose region-suitable high-yielding varieties.",
                    "Use seed treatment before sowing.",
                    "Follow soil-test-based fertilizer scheduling.",
                    "Monitor pests weekly and respond early.",
                    "Harvest at proper maturity for better returns.",
                ],
            }
        )

LANGUAGE_PATCHES = {
    "hi": {
        "rice": {
            "local_names": ["धान", "चावल", "अक्की"],
            "overview": {
                "description": "धान भारत की प्रमुख खाद्यान्न फसल है और सिंचित तथा वर्षा आधारित क्षेत्रों में उगाई जाती है।",
                "origin": "दक्षिण और दक्षिण-पूर्व एशिया",
                "climate": "गर्म और आर्द्र",
                "season": "खरीफ",
            },
            "quick_tips": [
                "20-25 दिन की स्वस्थ पौध का रोपण करें।",
                "अधिक नाइट्रोजन से बचें ताकि कीट कम लगें।",
                "प्रारंभिक अवस्था में उथला पानी बनाए रखें।",
                "हर सप्ताह खेत का निरीक्षण करें।",
                "समय पर कटाई से गुणवत्ता और दाम बेहतर मिलते हैं।",
            ],
        }
    }
}

STATE_CALENDAR = {
    "karnataka": {
        6: {
            "sow": ["rice", "maize", "ragi", "soybean"],
            "harvest": ["onion"],
            "activities": ["Land preparation", "Nursery raising", "Seed treatment"],
            "weather_advisory": "Monsoon onset. Ensure proper drainage and avoid water stagnation.",
        },
        10: {
            "sow": ["wheat", "onion", "potato"],
            "harvest": ["rice", "maize"],
            "activities": ["Residue management", "Rabi planning"],
            "weather_advisory": "Post-monsoon period. Prepare for rabi sowing with residual moisture.",
        },
    },
    "maharashtra": {
        6: {
            "sow": ["soybean", "cotton", "maize"],
            "harvest": ["summer vegetables"],
            "activities": ["Seed procurement", "Basal fertilizer application"],
            "weather_advisory": "Early monsoon showers. Complete sowing in optimum window.",
        },
        11: {
            "sow": ["wheat", "onion", "chickpea"],
            "harvest": ["soybean", "cotton"],
            "activities": ["Market planning", "Storage preparation"],
            "weather_advisory": "Cool and dry conditions. Use irrigation scheduling for rabi crops.",
        },
    },
}


def _normalize(value: str | None) -> str:
    return str(value or "").strip().lower()


def _localized_crop(crop_data: dict[str, Any], language: str) -> dict[str, Any]:
    localized = deepcopy(crop_data)
    patch = LANGUAGE_PATCHES.get(_normalize(language), {}).get(localized["name"])
    if patch:
        localized.update(patch)
    return localized


async def get_all_crops(language: str = "en", category: str | None = None) -> list[dict[str, Any]]:
    crops = []
    for crop_name in SUPPORTED_CROPS:
        crop = _localized_crop(CROP_GUIDES_EN[crop_name], language)
        if category and _normalize(crop["category"]) != _normalize(category):
            continue
        crops.append(
            {
                "name": crop["name"],
                "local_names": crop["local_names"],
                "category": crop["category"],
                "season": crop["season"],
                "states": crop["states"],
                "difficulty": crop["difficulty"],
                "profit_potential": crop["profit_potential"],
                "water_requirement": crop["water_requirement"],
                "image_description": crop["image_description"],
            }
        )
    return crops


async def get_crop_guide(crop_name: str, language: str = "en") -> dict[str, Any]:
    key = _normalize(crop_name)
    if key not in CROP_GUIDES_EN:
        raise HTTPException(status_code=404, detail="Unsupported crop")
    return _localized_crop(CROP_GUIDES_EN[key], language)


async def get_seasonal_calendar(state: str, month: int) -> dict[str, Any]:
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    state_data = STATE_CALENDAR.get(_normalize(state), {})
    month_data = state_data.get(month)

    if month_data is None:
        return {
            "state": state,
            "month": month,
            "crops_to_sow": ["rice", "wheat", "maize"],
            "crops_to_harvest": ["seasonal crops"],
            "important_activities": ["Field scouting", "Soil testing", "Irrigation planning"],
            "weather_advisory": "Use district weather forecast and plan operations accordingly.",
        }

    return {
        "state": state,
        "month": month,
        "crops_to_sow": month_data["sow"],
        "crops_to_harvest": month_data["harvest"],
        "important_activities": month_data["activities"],
        "weather_advisory": month_data["weather_advisory"],
    }


async def get_crop_comparison(crop1: str, crop2: str) -> dict[str, Any]:
    guide1 = await get_crop_guide(crop1)
    guide2 = await get_crop_guide(crop2)

    return {
        "crop1": {
            "name": guide1["name"],
            "season": guide1["season"],
            "difficulty": guide1["difficulty"],
            "profit_potential": guide1["profit_potential"],
            "water_requirement": guide1["water_requirement"],
            "yield_per_acre": guide1["harvesting"]["yield_per_acre"],
        },
        "crop2": {
            "name": guide2["name"],
            "season": guide2["season"],
            "difficulty": guide2["difficulty"],
            "profit_potential": guide2["profit_potential"],
            "water_requirement": guide2["water_requirement"],
            "yield_per_acre": guide2["harvesting"]["yield_per_acre"],
        },
    }


async def get_quick_tips(crop_name: str, language: str = "en") -> list[str]:
    guide = await get_crop_guide(crop_name, language=language)
    tips = guide.get("quick_tips", [])
    return tips[:5]
