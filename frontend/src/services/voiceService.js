const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

// Voice IDs for different languages
const VOICE_MAP = {
  en: '21m00Tcm4TlvDq8ikWAM',
  hi: 'AZnzlk1XvdvUeBnXmlld',
  kn: '21m00Tcm4TlvDq8ikWAM',
  ta: '21m00Tcm4TlvDq8ikWAM',
  te: '21m00Tcm4TlvDq8ikWAM',
  mr: 'AZnzlk1XvdvUeBnXmlld',
  gu: '21m00Tcm4TlvDq8ikWAM',
  bn: '21m00Tcm4TlvDq8ikWAM',
  pa: '21m00Tcm4TlvDq8ikWAM',
  ml: '21m00Tcm4TlvDq8ikWAM',
};

const GREETINGS = {
  en: 'Welcome to KrishiMitra! Your smart farming assistant is ready to help you today.',
  hi: 'कृषिमित्र में आपका स्वागत है! आपका स्मार्ट कृषि सहायक आज आपकी मदद के लिए तैयार है।',
  kn: 'ಕೃಷಿಮಿತ್ರಕ್ಕೆ ಸ್ವಾಗತ! ನಿಮ್ಮ ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಸಹಾಯಕ ಇಂದು ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ ಸಿದ್ಧವಾಗಿದೆ.',
  ta: 'கிரிஷிமித்ராவிற்கு வரவேற்கிறோம்! உங்கள் ஸ்மார்ட் விவசாய உதவியாளர் தயாராக இருக்கிறார்.',
  te: 'కృషిమిత్రకు స్వాగతం! మీ స్మార్ట్ వ్యవసాయ సహాయకుడు సిద్ధంగా ఉన్నారు.',
  mr: 'कृषिमित्रमध्ये आपले स्वागत आहे! तुमचा स्मार्ट शेती सहाय्यक तयार आहे.',
  gu: 'કૃષિમિત્રમાં આપનું સ્વાગત છે! તમારો સ્માર્ટ ખેતી સહાયક તૈયાર છે.',
  bn: 'কৃষিমিত্রে আপনাকে স্বাগতম! আপনার স্মার্ট কৃষি সহায়ক প্রস্তুত।',
  pa: 'ਕ੍ਰਿਸ਼ਿਮਿਤ੍ਰ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ! ਤੁਹਾਡਾ ਸਮਾਰਟ ਖੇਤੀ ਸਹਾਇਕ ਤਿਆਰ ਹੈ।',
  ml: 'കൃഷിമിത്രയിലേക്ക് സ്വാഗതം! നിങ്ങളുടെ സ്മാർട്ട് കൃഷി സഹായി തയ്യാറാണ്.',
};

const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  pa: 'pa-IN',
  ml: 'ml-IN',
};

export const speakWithBrowser = (text, language = 'en') => {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LOCALE_MAP[language] || 'en-IN';
  utterance.rate = 0.9;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
};

export const speakWithElevenLabs = async (text, language = 'en') => {
  if (!ELEVENLABS_API_KEY) {
    console.warn('ElevenLabs API key not set, falling back to browser TTS');
    speakWithBrowser(text, language);
    return;
  }

  try {
    const voiceId = VOICE_MAP[language] || VOICE_MAP.en;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('ElevenLabs error:', response.status);
      speakWithBrowser(text, language);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    if (window.currentAudio) {
      window.currentAudio.pause();
      URL.revokeObjectURL(window.currentAudio.src);
    }

    const audio = new Audio(url);
    window.currentAudio = audio;
    await audio.play();

    audio.onended = () => {
      URL.revokeObjectURL(url);
      window.currentAudio = null;
    };
  } catch (error) {
    console.error('ElevenLabs failed:', error);
    speakWithBrowser(text, language);
  }
};

export const playGreeting = async (language = 'en', userName = '') => {
  const alreadyGreeted = sessionStorage.getItem('krishimitra_greeted');
  if (alreadyGreeted) return;
  sessionStorage.setItem('krishimitra_greeted', 'true');

  const greeting = GREETINGS[language] || GREETINGS.en;
  const personalizedGreeting = userName
    ? greeting.replace('!', `, ${userName}!`)
    : greeting;

  // Wait 1.5 seconds after page load before greeting
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await speakWithElevenLabs(personalizedGreeting, language);
};

export const startVoiceInput = (language, onResult, onError) => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError('Voice input not supported. Please use Chrome browser.');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = LOCALE_MAP[language] || 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') {
      onError('Microphone access denied. Please allow microphone in browser settings.');
    } else {
      onError(`Voice error: ${event.error}`);
    }
  };

  recognition.start();
  return recognition;
};
