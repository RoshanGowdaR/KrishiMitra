from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from app.services.chatbot_service import translate_text

QUIZ_CATEGORIES = {
    "crop_management",
    "soil_health",
    "pest_control",
    "irrigation",
    "government_schemes",
    "market_knowledge",
}
QUIZ_DIFFICULTIES = {"beginner", "intermediate", "advanced"}

_LEADERBOARD: list[dict[str, Any]] = []
_QUIZ_TRANSLATION_CACHE: dict[tuple[str, str], dict[str, Any]] = {}

_QUIZZES: list[dict[str, Any]] = [
    {
        "id": "quiz-crop-basics-en",
        "title": "Crop Management Basics",
        "category": "crop_management",
        "difficulty": "beginner",
        "language": "en",
        "questions": [
            {
                "id": "q1",
                "question": "Which practice helps maintain soil moisture in summer?",
                "options": ["Mulching", "Deep ploughing every week", "Burning residues", "No irrigation"],
                "correct_answer": "Mulching",
                "explanation": "Mulching reduces surface evaporation and conserves moisture.",
            },
            {
                "id": "q2",
                "question": "What is the best stage to apply top-dressing nitrogen in rice?",
                "options": ["Tillering stage", "At harvest", "Before sowing only", "After threshing"],
                "correct_answer": "Tillering stage",
                "explanation": "Nitrogen at tillering supports vegetative growth and tiller development.",
            },
            {
                "id": "q3",
                "question": "Which crop rotation improves soil fertility?",
                "options": ["Rice-Wheat", "Rice-Rice", "Maize-Pulse", "Cotton-Cotton"],
                "correct_answer": "Maize-Pulse",
                "explanation": "Pulse crops fix nitrogen and improve soil fertility.",
            },
            {
                "id": "q4",
                "question": "Drip irrigation is most useful for:",
                "options": ["Water-intensive flood fields", "Orchards and vegetables", "Paddy transplanting", "Only rainfed lands"],
                "correct_answer": "Orchards and vegetables",
                "explanation": "Drip delivers water directly to root zones, ideal for horticulture.",
            },
            {
                "id": "q5",
                "question": "Why should farmers perform soil testing?",
                "options": ["To increase pesticide use", "To know nutrient status", "To avoid all fertilizers", "For weather forecast"],
                "correct_answer": "To know nutrient status",
                "explanation": "Soil testing guides balanced nutrient application.",
            },
        ],
    },
    {
        "id": "quiz-crop-basics-hi",
        "title": "फसल प्रबंधन की बुनियाद",
        "category": "crop_management",
        "difficulty": "beginner",
        "language": "hi",
        "questions": [
            {
                "id": "q1",
                "question": "गर्मी में मिट्टी की नमी बनाए रखने के लिए क्या उपयोगी है?",
                "options": ["मल्चिंग", "हर सप्ताह गहरी जुताई", "अवशेष जलाना", "सिंचाई न करना"],
                "correct_answer": "मल्चिंग",
                "explanation": "मल्चिंग से वाष्पीकरण कम होता है और नमी बनी रहती है।",
            },
            {
                "id": "q2",
                "question": "धान में नाइट्रोजन टॉप ड्रेसिंग का सही समय क्या है?",
                "options": ["टिलरिंग अवस्था", "कटाई के समय", "केवल बुवाई से पहले", "मड़ाई के बाद"],
                "correct_answer": "टिलरिंग अवस्था",
                "explanation": "टिलरिंग अवस्था में नाइट्रोजन देने से वृद्धि अच्छी होती है।",
            },
            {
                "id": "q3",
                "question": "कौन-सा फसल चक्र मिट्टी की उर्वरता बढ़ाता है?",
                "options": ["धान-गेहूं", "धान-धान", "मक्का-दाल", "कपास-कपास"],
                "correct_answer": "मक्का-दाल",
                "explanation": "दाल फसलें नाइट्रोजन स्थिरीकरण में मदद करती हैं।",
            },
            {
                "id": "q4",
                "question": "ड्रिप सिंचाई सबसे अधिक किसके लिए उपयोगी है?",
                "options": ["फ्लड सिंचाई वाले खेत", "बागवानी और सब्जियां", "धान रोपाई", "केवल वर्षा आधारित क्षेत्र"],
                "correct_answer": "बागवानी और सब्जियां",
                "explanation": "ड्रिप सिंचाई जड़ों तक लक्षित पानी पहुंचाती है।",
            },
            {
                "id": "q5",
                "question": "किसान को मिट्टी परीक्षण क्यों करना चाहिए?",
                "options": ["कीटनाशक बढ़ाने के लिए", "पोषक तत्व स्थिति जानने के लिए", "सभी उर्वरक बंद करने के लिए", "मौसम जानने के लिए"],
                "correct_answer": "पोषक तत्व स्थिति जानने के लिए",
                "explanation": "मिट्टी परीक्षण से संतुलित उर्वरक सिफारिश मिलती है।",
            },
        ],
    },
    {
        "id": "quiz-pest-control-en",
        "title": "Pest Control and IPM",
        "category": "pest_control",
        "difficulty": "intermediate",
        "language": "en",
        "questions": [
            {
                "id": "q1",
                "question": "What does IPM stand for?",
                "options": ["Integrated Pest Management", "Internal Plant Medicine", "Irrigation Plan Method", "Improved Produce Marketing"],
                "correct_answer": "Integrated Pest Management",
                "explanation": "IPM combines cultural, biological, and chemical controls.",
            },
            {
                "id": "q2",
                "question": "Yellow sticky traps are mainly used for:",
                "options": ["Rodents", "Sucking pests", "Fungal spores", "Nematodes"],
                "correct_answer": "Sucking pests",
                "explanation": "Aphids, whiteflies, and similar pests are attracted to yellow traps.",
            },
            {
                "id": "q3",
                "question": "Neem-based formulations are generally:",
                "options": ["Broad-spectrum synthetic poison", "Bio-pesticide option", "Fertilizer substitute", "Irrigation additive"],
                "correct_answer": "Bio-pesticide option",
                "explanation": "Neem products are commonly used as safer pest management options.",
            },
            {
                "id": "q4",
                "question": "Economic Threshold Level (ETL) indicates:",
                "options": ["Market price floor", "Pest level where control is justified", "Soil pH target", "Harvest maturity"],
                "correct_answer": "Pest level where control is justified",
                "explanation": "ETL helps decide when intervention is economically beneficial.",
            },
            {
                "id": "q5",
                "question": "Best practice before spraying pesticides is:",
                "options": ["Ignore label instructions", "Use recommended dose and PPE", "Spray at noon heat", "Mix all available chemicals"],
                "correct_answer": "Use recommended dose and PPE",
                "explanation": "Safe and effective application requires label compliance and PPE.",
            },
        ],
    },
    {
        "id": "quiz-pest-control-hi",
        "title": "कीट नियंत्रण और आईपीएम",
        "category": "pest_control",
        "difficulty": "intermediate",
        "language": "hi",
        "questions": [
            {
                "id": "q1",
                "question": "IPM का पूरा नाम क्या है?",
                "options": ["इंटीग्रेटेड पेस्ट मैनेजमेंट", "इंटरनल प्लांट मेडिसिन", "इरिगेशन प्लान मेथड", "इम्प्रूव्ड प्रोड्यूस मार्केटिंग"],
                "correct_answer": "इंटीग्रेटेड पेस्ट मैनेजमेंट",
                "explanation": "IPM में जैविक, सांस्कृतिक और रासायनिक नियंत्रण शामिल हैं।",
            },
            {
                "id": "q2",
                "question": "पीले स्टिकी ट्रैप मुख्य रूप से किसके लिए उपयोग होते हैं?",
                "options": ["कृंतक", "चूसक कीट", "फफूंदी बीजाणु", "नेमाटोड"],
                "correct_answer": "चूसक कीट",
                "explanation": "एफिड और व्हाइटफ्लाई जैसे कीट पीले ट्रैप की ओर आकर्षित होते हैं।",
            },
            {
                "id": "q3",
                "question": "नीम आधारित उत्पाद सामान्यतः क्या हैं?",
                "options": ["सिंथेटिक जहर", "जैव-कीटनाशक विकल्प", "उर्वरक विकल्प", "सिंचाई योजक"],
                "correct_answer": "जैव-कीटनाशक विकल्प",
                "explanation": "नीम उत्पाद अपेक्षाकृत सुरक्षित कीट प्रबंधन विकल्प हैं।",
            },
            {
                "id": "q4",
                "question": "Economic Threshold Level (ETL) का अर्थ है:",
                "options": ["बाजार न्यूनतम मूल्य", "कीट स्तर जहां नियंत्रण जरूरी", "मिट्टी pH लक्ष्य", "कटाई परिपक्वता"],
                "correct_answer": "कीट स्तर जहां नियंत्रण जरूरी",
                "explanation": "ETL बताता है कि कब नियंत्रण आर्थिक रूप से लाभदायक होगा।",
            },
            {
                "id": "q5",
                "question": "कीटनाशक छिड़काव से पहले सबसे अच्छी प्रथा क्या है?",
                "options": ["लेबल निर्देश न पढ़ना", "अनुशंसित मात्रा और PPE", "दोपहर की गर्मी में छिड़काव", "सभी रसायनों को मिलाना"],
                "correct_answer": "अनुशंसित मात्रा और PPE",
                "explanation": "सुरक्षित और प्रभावी छिड़काव के लिए लेबल निर्देश और PPE जरूरी हैं।",
            },
        ],
    },
    {
        "id": "quiz-schemes-market-en",
        "title": "Schemes and Market Knowledge",
        "category": "government_schemes",
        "difficulty": "advanced",
        "language": "en",
        "questions": [
            {
                "id": "q1",
                "question": "PM-KISAN provides annual support of:",
                "options": ["INR 3,000", "INR 6,000", "INR 9,000", "INR 12,000"],
                "correct_answer": "INR 6,000",
                "explanation": "PM-KISAN provides INR 6,000 yearly in three installments.",
            },
            {
                "id": "q2",
                "question": "eNAM primarily enables:",
                "options": ["Subsidy transfer", "Digital agri trading", "Crop insurance claims", "Soil testing"],
                "correct_answer": "Digital agri trading",
                "explanation": "eNAM is an online trading platform for agricultural produce.",
            },
            {
                "id": "q3",
                "question": "Which scheme is dedicated to crop insurance?",
                "options": ["SMAM", "PMFBY", "PKVY", "PMKSY"],
                "correct_answer": "PMFBY",
                "explanation": "PMFBY is the crop insurance scheme.",
            },
            {
                "id": "q4",
                "question": "KCC is mainly related to:",
                "options": ["Farm credit", "Market linkage", "Irrigation subsidy", "Soil health"],
                "correct_answer": "Farm credit",
                "explanation": "Kisan Credit Card supports farm working capital and credit needs.",
            },
            {
                "id": "q5",
                "question": "Modal price in mandi reports means:",
                "options": ["Minimum observed price", "Most frequently quoted price", "Government MSP", "Maximum observed price"],
                "correct_answer": "Most frequently quoted price",
                "explanation": "Modal price is the most commonly prevailing market price.",
            },
        ],
    },
    {
        "id": "quiz-schemes-market-hi",
        "title": "योजनाएं और बाजार ज्ञान",
        "category": "government_schemes",
        "difficulty": "advanced",
        "language": "hi",
        "questions": [
            {
                "id": "q1",
                "question": "PM-KISAN के अंतर्गत वार्षिक सहायता कितनी है?",
                "options": ["INR 3,000", "INR 6,000", "INR 9,000", "INR 12,000"],
                "correct_answer": "INR 6,000",
                "explanation": "PM-KISAN में सालाना INR 6,000 तीन किस्तों में मिलते हैं।",
            },
            {
                "id": "q2",
                "question": "eNAM मुख्य रूप से क्या सक्षम करता है?",
                "options": ["सब्सिडी ट्रांसफर", "डिजिटल कृषि व्यापार", "बीमा दावा", "मिट्टी परीक्षण"],
                "correct_answer": "डिजिटल कृषि व्यापार",
                "explanation": "eNAM कृषि उपज के लिए ऑनलाइन ट्रेडिंग प्लेटफॉर्म है।",
            },
            {
                "id": "q3",
                "question": "कौन-सी योजना फसल बीमा के लिए है?",
                "options": ["SMAM", "PMFBY", "PKVY", "PMKSY"],
                "correct_answer": "PMFBY",
                "explanation": "PMFBY फसल बीमा के लिए समर्पित योजना है।",
            },
            {
                "id": "q4",
                "question": "KCC मुख्य रूप से किससे जुड़ा है?",
                "options": ["कृषि ऋण", "बाजार संपर्क", "सिंचाई सब्सिडी", "मिट्टी स्वास्थ्य"],
                "correct_answer": "कृषि ऋण",
                "explanation": "KCC किसानों को कार्यशील पूंजी और ऋण सहायता देता है।",
            },
            {
                "id": "q5",
                "question": "मंडी रिपोर्ट में modal price का अर्थ क्या है?",
                "options": ["न्यूनतम मूल्य", "सबसे अधिक प्रचलित मूल्य", "MSP", "अधिकतम मूल्य"],
                "correct_answer": "सबसे अधिक प्रचलित मूल्य",
                "explanation": "Modal price वह मूल्य है जो बाजार में सबसे अधिक दिखता है।",
            },
        ],
    },
]


def _sanitize_quiz(quiz: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": quiz["id"],
        "title": quiz["title"],
        "category": quiz["category"],
        "difficulty": "beginner",
        "language": quiz["language"],
        "questions": quiz["questions"],
    }


def _base_id(quiz_id: str) -> str:
    if quiz_id.endswith("-en"):
        return quiz_id[:-3]
    if quiz_id.endswith("-hi"):
        return quiz_id[:-3]
    return quiz_id


async def _translate_quiz(quiz: dict[str, Any], target_language: str) -> dict[str, Any]:
    cache_key = (quiz["id"], target_language)
    if cache_key in _QUIZ_TRANSLATION_CACHE:
        return _QUIZ_TRANSLATION_CACHE[cache_key]

    translated_questions = []
    for question in quiz["questions"]:
        translated_question = await translate_text(question["question"], target_language)
        translated_options = [await translate_text(option, target_language) for option in question["options"]]
        translated_correct = translated_options[question["options"].index(question["correct_answer"])]
        translated_explanation = await translate_text(question["explanation"], target_language)

        translated_questions.append({
            "id": question["id"],
            "question": translated_question,
            "options": translated_options,
            "correct_answer": translated_correct,
            "explanation": translated_explanation,
        })

    translated_title = await translate_text(quiz["title"], target_language)
    translated_quiz = {
        "id": f"{_base_id(quiz['id'])}-{target_language}",
        "title": translated_title,
        "category": quiz["category"],
        "difficulty": "beginner",
        "language": target_language,
        "questions": translated_questions,
    }
    _QUIZ_TRANSLATION_CACHE[cache_key] = translated_quiz
    return translated_quiz


async def get_quizzes(
    language: str = "en",
    category: str | None = None,
    difficulty: str | None = None,
) -> list[dict[str, Any]]:
    normalized_language = language.strip().lower()
    filtered = [quiz for quiz in _QUIZZES if quiz["language"] == normalized_language]

    if not filtered:
        english_quizzes = [quiz for quiz in _QUIZZES if quiz["language"] == "en"]
        translated = [await _translate_quiz(quiz, normalized_language) for quiz in english_quizzes]
        filtered = translated

    if category:
        normalized_category = category.strip().lower()
        if normalized_category not in QUIZ_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid quiz category")
        filtered = [quiz for quiz in filtered if quiz["category"] == normalized_category]

    if difficulty:
        normalized_difficulty = difficulty.strip().lower()
        if normalized_difficulty not in QUIZ_DIFFICULTIES:
            raise HTTPException(status_code=400, detail="Invalid quiz difficulty")
        filtered = [quiz for quiz in filtered if quiz["difficulty"] == normalized_difficulty]

    return [_sanitize_quiz(quiz) for quiz in filtered]


async def get_quiz_by_id(quiz_id: str, language: str = "en") -> dict[str, Any]:
    normalized_id = quiz_id.strip().lower()
    normalized_language = language.strip().lower()

    for quiz in _QUIZZES:
        if quiz["id"] == normalized_id and quiz["language"] == normalized_language:
            return _sanitize_quiz(quiz)

    target_base = _base_id(normalized_id)
    for quiz in _QUIZZES:
        if _base_id(quiz["id"]) == target_base and quiz["language"] == "en":
            translated = await _translate_quiz(quiz, normalized_language)
            return _sanitize_quiz(translated)

    raise HTTPException(status_code=404, detail="Quiz not found")


async def submit_quiz(quiz_id: str, answers: list[dict[str, str]]) -> dict[str, Any]:
    quiz = None
    for item in _QUIZZES:
        if item["id"] == quiz_id.strip().lower():
            quiz = item
            break

    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    answer_map = {
        str(answer.get("question_id", "")).strip(): str(answer.get("answer", "")).strip()
        for answer in answers
    }

    total_questions = len(quiz["questions"])
    correct_count = 0
    results: list[dict[str, Any]] = []

    for question in quiz["questions"]:
        question_id = question["id"]
        submitted = answer_map.get(question_id, "")
        correct_answer = question["correct_answer"]
        is_correct = submitted == correct_answer
        if is_correct:
            correct_count += 1

        results.append(
            {
                "question_id": question_id,
                "submitted_answer": submitted,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": question["explanation"],
            }
        )

    score_percentage = (correct_count / total_questions) * 100 if total_questions else 0.0

    leaderboard_item = {
        "attempt_id": str(uuid4()),
        "quiz_id": quiz["id"],
        "score_percentage": score_percentage,
        "correct_answers": correct_count,
        "total_questions": total_questions,
        "submitted_at": datetime.utcnow().isoformat() + "Z",
    }
    _LEADERBOARD.append(leaderboard_item)

    return {
        "quiz_id": quiz["id"],
        "score_percentage": score_percentage,
        "correct_answers": correct_count,
        "total_questions": total_questions,
        "results": results,
    }


async def get_leaderboard() -> list[dict[str, Any]]:
    sorted_items = sorted(
        _LEADERBOARD,
        key=lambda item: (item["score_percentage"], item["correct_answers"]),
        reverse=True,
    )
    return sorted_items[:10]


async def reset_quiz_state() -> None:
    _LEADERBOARD.clear()
