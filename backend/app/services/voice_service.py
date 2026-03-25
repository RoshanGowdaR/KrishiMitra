import httpx

from app.config import get_settings

LANGUAGE_VOICE_MAP = {
    "en": {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
    "hi": {"voice_id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi"},
    "kn": {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
    "ta": {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
    "te": {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
    "mr": {"voice_id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi"},
    "gu": {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
    "bn": {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
    "pa": {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
    "ml": {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
}

GREETINGS = {
    "en": "Welcome to KrishiMitra! Your smart farming companion is ready to help you.",
    "hi": "कृषिमित्र में आपका स्वागत है! आपका स्मार्ट कृषि सहायक तैयार है।",
    "kn": "ಕೃಷಿಮಿತ್ರಕ್ಕೆ ಸ್ವಾಗತ! ನಿಮ್ಮ ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಸಹಾಯಕ ಸಿದ್ಧವಾಗಿದೆ.",
    "ta": "கிரிஷிமித்ராவிற்கு வரவேற்கிறோம்! உங்கள் ஸ்மார்ட் விவசாய உதவியாளர் தயாராக இருக்கிறார்.",
    "te": "కృషిమిత్రకు స్వాగతం! మీ స్మార్ట్ వ్యవసాయ సహాయకుడు సిద్ధంగా ఉన్నారు.",
    "mr": "कृषिमित्रमध्ये आपले स्वागत आहे! तुमचा स्मार्ट शेती सहाय्यक तयार आहे.",
    "gu": "કૃષિમિત્રમાં આપનું સ્વાગત છે! તમારો સ્માર્ટ ખેતી સહાયક તૈયાર છે.",
    "bn": "কৃষিমিত্রে আপনাকে স্বাগতম! আপনার স্মার্ট কৃষি সহায়ক প্রস্তুত।",
    "pa": "ਕ੍ਰਿਸ਼ਿਮਿਤ੍ਰ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ! ਤੁਹਾਡਾ ਸਮਾਰਟ ਖੇਤੀ ਸਹਾਇਕ ਤਿਆਰ ਹੈ।",
    "ml": "കൃഷിമിത്രയിലേക്ക് സ്വാഗതം! നിങ്ങളുടെ സ്മാർട്ട് കൃഷി സഹായി തയ്യാറാണ്.",
}


async def generate_speech(text: str, language: str = "en") -> bytes:
    settings = get_settings()
    api_key = settings.elevenlabs_api_key

    if not api_key or api_key == "your_elevenlabs_key":
        raise ValueError("ElevenLabs API key not configured")

    voice_config = LANGUAGE_VOICE_MAP.get(language, LANGUAGE_VOICE_MAP["en"])
    voice_id = voice_config["voice_id"]

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                },
            },
        )

        if response.status_code != 200:
            raise Exception(f"ElevenLabs error: {response.status_code}")

        return response.content


async def get_greeting_audio(language: str = "en") -> bytes:
    text = GREETINGS.get(language, GREETINGS["en"])
    return await generate_speech(text, language)
