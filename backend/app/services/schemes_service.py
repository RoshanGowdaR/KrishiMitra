from copy import deepcopy
from typing import Any

from fastapi import HTTPException

ALLOWED_SCHEME_TYPES = {"subsidy", "insurance", "loan", "equipment", "training"}

_SCHEMES: list[dict[str, Any]] = [
    {
        "id": "pm-kisan",
        "name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "description": "Direct income support scheme that provides financial assistance to eligible farmer families.",
        "eligibility": [
            "Farmer family with cultivable land",
            "Must have valid land records",
            "Institutional landholders are excluded",
        ],
        "benefits": [
            "INR 6,000 per year in three equal installments",
            "Direct Benefit Transfer to bank account",
        ],
        "application_process": [
            "Register on PM-KISAN portal or through CSC",
            "Submit Aadhaar, bank account and land documents",
            "Verification by state authorities",
        ],
        "deadline": "Open throughout the year",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "scheme_type": "subsidy",
    },
    {
        "id": "pmfby",
        "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "description": "Crop insurance scheme to protect farmers against crop loss due to natural calamities, pests and diseases.",
        "eligibility": [
            "All farmers growing notified crops in notified areas",
            "Loanee and non-loanee farmers can enroll",
        ],
        "benefits": [
            "Comprehensive crop insurance coverage",
            "Low premium rates for farmers",
            "Claim settlement for yield losses",
        ],
        "application_process": [
            "Apply through bank, CSC, insurance company or PMFBY portal",
            "Select season and crop details",
            "Pay farmer premium and submit documents",
        ],
        "deadline": "Before notified sowing cut-off date",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "scheme_type": "insurance",
    },
    {
        "id": "kcc",
        "name": "Kisan Credit Card (KCC)",
        "description": "Credit support scheme that provides timely short-term loans for crop cultivation and allied activities.",
        "eligibility": [
            "Individual or joint farmers",
            "Tenant farmers, oral lessees and sharecroppers may apply",
            "Must satisfy bank credit norms",
        ],
        "benefits": [
            "Short-term crop loan",
            "Working capital for allied activities",
            "Interest subvention subject to norms",
        ],
        "application_process": [
            "Apply at bank branch with KCC form",
            "Provide identity, land/tenancy and crop details",
            "Bank appraisal and card sanction",
        ],
        "deadline": "Open throughout the year",
        "ministry": "Department of Financial Services / Ministry of Agriculture and Farmers Welfare",
        "scheme_type": "loan",
    },
    {
        "id": "pkvy",
        "name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "description": "Promotes cluster-based organic farming with support for certification and value addition.",
        "eligibility": [
            "Farmer groups in cluster approach",
            "Willingness to adopt organic practices",
        ],
        "benefits": [
            "Financial support for organic inputs and certification",
            "Cluster development and training support",
        ],
        "application_process": [
            "Coordinate with state agriculture department",
            "Form or join organic farmer cluster",
            "Complete registration and implementation plan",
        ],
        "deadline": "As per state annual action plans",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "scheme_type": "training",
    },
    {
        "id": "smam",
        "name": "Sub-Mission on Agricultural Mechanization (SMAM)",
        "description": "Supports farm mechanization through subsidies on agricultural machinery and equipment.",
        "eligibility": [
            "Eligible farmers as per state guidelines",
            "Priority often given to small and marginal farmers",
        ],
        "benefits": [
            "Subsidy on eligible machinery",
            "Support for custom hiring centers in some states",
        ],
        "application_process": [
            "Apply on state agriculture mechanization portal",
            "Submit farmer and land documents",
            "Selection and subsidy disbursement as per state rules",
        ],
        "deadline": "As per state notifications",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "scheme_type": "equipment",
    },
    {
        "id": "pmksy",
        "name": "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
        "description": "Irrigation support initiative focused on efficient water use and expansion of irrigation coverage.",
        "eligibility": [
            "Farmers seeking irrigation and water efficiency support",
            "Eligibility varies by component and state",
        ],
        "benefits": [
            "Support for micro-irrigation and water conservation",
            "Improved irrigation infrastructure under components",
        ],
        "application_process": [
            "Apply through state horticulture/agriculture department",
            "Choose relevant PMKSY component",
            "Field verification and approval",
        ],
        "deadline": "As per state component schedule",
        "ministry": "Ministry of Jal Shakti / Ministry of Agriculture and Farmers Welfare",
        "scheme_type": "subsidy",
    },
    {
        "id": "enam",
        "name": "National Agriculture Market (eNAM)",
        "description": "Digital trading platform integrating APMC mandis for transparent price discovery and online trading.",
        "eligibility": [
            "Farmers trading at eNAM integrated mandis",
            "Registration required through mandi or portal",
        ],
        "benefits": [
            "Access to wider market and transparent bidding",
            "Better price discovery and digital transactions",
        ],
        "application_process": [
            "Register via eNAM portal/app or mandi facilitation center",
            "Complete KYC and bank details",
            "Start listing produce in eligible mandis",
        ],
        "deadline": "Open throughout the year",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "scheme_type": "training",
    },
    {
        "id": "soil-health-card",
        "name": "Soil Health Card Scheme",
        "description": "Provides soil nutrient status and fertilizer recommendations to improve soil health and productivity.",
        "eligibility": [
            "All farmers can avail soil testing services",
            "Soil sample collection through designated channels",
        ],
        "benefits": [
            "Soil nutrient analysis report",
            "Crop-wise fertilizer recommendations",
        ],
        "application_process": [
            "Contact local agriculture office or soil testing lab",
            "Submit soil sample and farmer details",
            "Receive Soil Health Card report",
        ],
        "deadline": "Open throughout the year",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "scheme_type": "training",
    },
]

_LANGUAGE_PATCHES: dict[str, dict[str, dict[str, Any]]] = {
    "hi": {
        "pm-kisan": {
            "name": "प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)",
            "description": "यह योजना पात्र किसान परिवारों को प्रत्यक्ष आय सहायता प्रदान करती है।",
        },
        "pmfby": {
            "name": "प्रधानमंत्री फसल बीमा योजना (PMFBY)",
            "description": "फसल हानि की स्थिति में किसानों को बीमा सुरक्षा प्रदान करने वाली योजना।",
        },
        "kcc": {
            "name": "किसान क्रेडिट कार्ड (KCC)",
            "description": "खेती और संबद्ध गतिविधियों के लिए समय पर ऋण सहायता।",
        },
        "pkvy": {
            "name": "परंपरागत कृषि विकास योजना (PKVY)",
            "description": "क्लस्टर आधारित जैविक खेती को बढ़ावा देने वाली योजना।",
        },
        "smam": {
            "name": "कृषि यंत्रीकरण उप-मिशन (SMAM)",
            "description": "कृषि मशीनरी पर सहायता देकर यंत्रीकरण को बढ़ावा।",
        },
        "pmksy": {
            "name": "प्रधानमंत्री कृषि सिंचाई योजना (PMKSY)",
            "description": "सिंचाई कवरेज बढ़ाने और जल दक्षता सुधारने की पहल।",
        },
        "enam": {
            "name": "राष्ट्रीय कृषि बाजार (eNAM)",
            "description": "पारदर्शी मूल्य खोज के लिए डिजिटल कृषि व्यापार मंच।",
        },
        "soil-health-card": {
            "name": "मृदा स्वास्थ्य कार्ड योजना",
            "description": "मृदा परीक्षण और उर्वरक सिफारिशों के माध्यम से उत्पादकता बढ़ाना।",
        },
    }
}


def _localized_scheme(scheme: dict[str, Any], language: str) -> dict[str, Any]:
    localized = deepcopy(scheme)
    language_key = language.lower()
    patch = _LANGUAGE_PATCHES.get(language_key, {}).get(localized["id"])
    if patch:
        localized.update(patch)

    if localized["scheme_type"] not in ALLOWED_SCHEME_TYPES:
        raise HTTPException(status_code=500, detail="Invalid scheme type configured")

    return localized


def _find_scheme_by_id(scheme_id: str) -> dict[str, Any] | None:
    normalized = scheme_id.strip().lower()
    for scheme in _SCHEMES:
        if scheme["id"] == normalized:
            return scheme
    return None


def _check_rules(scheme_id: str, farmer_profile: dict[str, Any]) -> tuple[bool, str]:
    land_size = float(farmer_profile.get("land_size", 0.0))
    annual_income = float(farmer_profile.get("income", 0.0))
    category = str(farmer_profile.get("category", "general")).strip().lower()

    if scheme_id == "pm-kisan":
        if land_size <= 0:
            return False, "Cultivable land is required for PM-KISAN"
        if annual_income > 1000000:
            return False, "Income level appears above typical PM-KISAN target group"
        return True, "Eligible based on available land and income profile"

    if scheme_id == "pmfby":
        if land_size <= 0:
            return False, "Insurable cropped land details are required"
        return True, "Eligible if notified crop and season criteria are met"

    if scheme_id == "kcc":
        if land_size <= 0:
            return False, "Land or tenancy details are required for KCC"
        return True, "Likely eligible subject to bank credit appraisal"

    if scheme_id == "pkvy":
        if land_size <= 0:
            return False, "Farm land details are required for PKVY"
        if land_size > 10:
            return False, "PKVY commonly prioritizes cluster-based small holdings"
        return True, "Eligible for cluster-based organic farming enrollment"

    if scheme_id == "smam":
        if land_size <= 0:
            return False, "Farm details are required for mechanization support"
        if category in {"sc", "st", "small", "marginal", "women"}:
            return True, "Eligible with likely priority category consideration"
        return True, "Eligible subject to state-specific subsidy norms"

    if scheme_id == "pmksy":
        if land_size <= 0:
            return False, "Land details are required for irrigation support"
        return True, "Eligible subject to component and state implementation"

    if scheme_id == "enam":
        return True, "Eligible upon mandi and eNAM registration"

    if scheme_id == "soil-health-card":
        return True, "All farmers are generally eligible for soil testing services"

    return False, "Unable to evaluate eligibility for this scheme"


async def get_all_schemes(language: str = "en") -> list[dict[str, Any]]:
    return [_localized_scheme(scheme, language) for scheme in _SCHEMES]


async def get_scheme_by_id(scheme_id: str, language: str = "en") -> dict[str, Any]:
    scheme = _find_scheme_by_id(scheme_id)
    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return _localized_scheme(scheme, language)


async def check_eligibility(
    scheme_id: str,
    farmer_profile: dict[str, Any],
    language: str = "en",
) -> dict[str, Any]:
    scheme = await get_scheme_by_id(scheme_id, language)
    is_eligible, reason = _check_rules(scheme["id"], farmer_profile)

    return {
        "scheme_id": scheme["id"],
        "scheme_name": scheme["name"],
        "is_eligible": is_eligible,
        "reason": reason,
    }
