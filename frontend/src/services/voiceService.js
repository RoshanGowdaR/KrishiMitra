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
  or: 'or-IN',
  as: 'as-IN',
};

const GREETINGS = {
  en: 'Welcome to KrishiMitra! Your smart farming assistant is ready.',
  hi: 'कृषिमित्र में आपका स्वागत है! आपका कृषि सहायक तैयार है।',
  kn: 'ಕೃಷಿಮಿತ್ರಕ್ಕೆ ಸ್ವಾಗತ! ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ ಸಿದ್ಧವಾಗಿದೆ.',
  ta: 'கிரிஷிமித்ராவிற்கு வரவேற்கிறோம்! உங்கள் விவசாய உதவியாளர் தயார்.',
  te: 'కృషిమిత్రకు స్వాగతం! మీ వ్యవసాయ సహాయకుడు సిద్ధంగా ఉన్నారు.',
  mr: 'कृषिमित्रमध्ये स्वागत! तुमचा शेती सहाय्यक तयार आहे.',
  gu: 'કૃષિમિત્રમાં સ્વાગત! તમારો ખેતી સહાયક તૈયાર છે.',
  bn: 'কৃষিমিত্রে স্বাগতম! আপনার কৃষি সহায়ক প্রস্তুত।',
  pa: 'ਕ੍ਰਿਸ਼ਿਮਿਤ੍ਰ ਵਿੱਚ ਸੁਆਗਤ! ਤੁਹਾਡਾ ਖੇਤੀ ਸਹਾਇਕ ਤਿਆਰ ਹੈ।',
  ml: 'കൃഷിമിത്രയിലേക്ക് സ്വാഗതം! നിങ്ങളുടെ കൃഷി സഹായി തയ്യാറാണ്.',
};

export const detectTextLanguage = (text) => {
  if (!text) return 'en';

  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or';

  return 'en';
};

export const speakText = (text, language = 'en') => {
  if (!text || !text.trim()) return;

  const detectedLang = detectTextLanguage(text);
  const finalLang = detectedLang !== 'en' ? detectedLang : language;

  console.log('Speaking text, detected:', detectedLang, 'final lang:', finalLang);

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LOCALE_MAP[finalLang] || 'en-IN';
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();

    console.log('Available voices:', voices.map((v) => `${v.lang} ${v.name}`));

    const locale = LOCALE_MAP[finalLang] || 'en-IN';
    const langCode = locale.split('-')[0];

    let selectedVoice = voices.find((v) => v.lang.toLowerCase() === locale.toLowerCase());

    if (!selectedVoice) {
      selectedVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(langCode.toLowerCase())
      );
    }

    if (!selectedVoice) {
      selectedVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes('google')
          && v.lang.toLowerCase().startsWith(langCode.toLowerCase())
      );
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Using voice:', selectedVoice.name, selectedVoice.lang);
    } else {
      console.log('No voice found for', finalLang, '- using default browser voice');
      utterance.lang = LOCALE_MAP[finalLang] || 'en-IN';
    }

    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    trySpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      trySpeak();
    };
    setTimeout(trySpeak, 500);
  }
};

export const playGreeting = (language = 'en', userName = '') => {
  const alreadyGreeted = sessionStorage.getItem('krishimitra_greeted');
  if (alreadyGreeted) return;
  sessionStorage.setItem('krishimitra_greeted', 'true');

  let text = GREETINGS[language] || GREETINGS.en;
  if (userName) {
    text = text.replace('!', `, ${userName}!`);
  }

  setTimeout(() => speakText(text, language), 2000);
};

export const startVoiceInput = (language, onResult, onError) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError('Voice input not supported. Please use Chrome.');
    return null;
  }

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
      onError('Microphone blocked. Allow mic in browser settings.');
    } else {
      onError(`Voice error: ${event.error}`);
    }
  };

  recognition.start();
  return recognition;
};
