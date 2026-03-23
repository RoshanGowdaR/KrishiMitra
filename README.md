# KrishiMitra

KrishiMitra is an agri-assistant platform with a FastAPI backend and a React (Vite) frontend.
It provides multilingual chatbot support, crop-disease help, authentication flow, and voice-enabled interactions.

This README has been updated to capture what has been completed so far, including the recent conversation work, key code changes, and commits.

## A to Z Progress Snapshot

- Authentication flow hardened with login-first protected routing.
- Browser speech features added for chatbot input and output.
- Chatbot moved to Groq-based text generation with key rotation support.
- Crop disease pipeline integrated with vision model flow and service updates.
- Dashboard home greeting added as one-time browser TTS after login.
- Error-handling and compatibility fixes applied across backend tests and frontend pages.
- Feature branch `feature1` updated with multiple commits and push confirmations.
- Global language-selection flow enforced for new users before profile setup.
- Home and chatbot UX behavior aligned for multilingual voice and text behavior.
- Integration routes/services expanded in backend for voice features.
- JSON/config and router wiring updated in backend app config/routes.
- Key recent milestones validated by local frontend dev run.
- Login greeting now uses browser TTS (no external voice API key required).
- Model fallback and key-rotation improvements landed in earlier feature commits.
- Navigation and auth callback paths updated to match new feature flows.
- Output voice toggle implemented in chatbot with persistent preference.
- Prompt-driven improvements from this conversation fully applied.
- Quality checks run at editor/diagnostic level on modified frontend files.
- Route package registration updated to expose new feature endpoints.
- Speech recognition path now captures microphone input and auto-sends message.
- Tests adjusted where needed for crop-disease service behavior.
- UI-level voice controls improved with listening state and clearer toggles.
- Voice service files introduced on backend feature branch.
- Web Speech API used for microphone input and text-to-speech output fallback.
- eXisting README modernized to reflect current full-stack status.
- Yet-to-do items remain around full manual cross-browser verification.
- Zero API-key dependency for browser speech I/O in frontend flow.

## Recent Work Completed In This Conversation

### 1) Commit pending feature changes first (requested by user)

Previously pending changes were committed and pushed to `feature1`.

Commit:
- `be91604` - `feat: add Groq crop vision and voice service integration`

Files included:
- `backend/app/config.py`
- `backend/app/routes/__init__.py`
- `backend/app/routes/voice.py`
- `backend/app/services/crop_disease_service.py`
- `backend/app/services/voice_service.py`
- `backend/tests/test_crop_disease.py`
- `frontend/src/pages/AuthCallback.jsx`
- `frontend/src/pages/Chatbot.jsx`

### 2) Browser-only voice improvements (new request)

Implemented microphone input and bot voice output using browser APIs only (no external voice key dependency).

Commit:
- `3eda10f` - `fix: enable browser speech input output and home greeting`

Files included:
- `frontend/src/pages/Chatbot.jsx`
- `frontend/src/pages/Home.jsx`

Behavior delivered:
- Chatbot mic button starts browser speech recognition.
- Recognized speech is inserted and auto-sent as a message.
- Bot responses can be spoken through browser `speechSynthesis` when voice is ON.
- Home page gives one-time spoken greeting after login (session-guarded).

### 3) Validation completed during this conversation

- Frontend edited files checked for IDE/editor diagnostics (no errors reported).
- Frontend dev server started successfully with Vite.
- Local URL came up on port `5174` when `5173` was occupied.
- Commits were pushed to `origin/feature1`.

## Recent Branch History (feature1)

- `3eda10f` - fix: enable browser speech input output and home greeting
- `be91604` - feat: add Groq crop vision and voice service integration
- `e332873` - feat: add Groq chatbot with key rotation, Gemini vision with model fallback
- `b255684` - feat: add mandatory language selection for new users before profile setup
- `d834dac` - fix: restore test compatibility, add Gemini key rotation and Google Sheets market prices
- `b1c77ba` - fix: enforce login-first auth flow with protected routes
- `513a93d` - fix: auth protection, encoding issues and language selection flow
- `20434ab` - fix: improve KRISHIMITRA hero text with letter animations and gradient underline

## Current Functional Scope

- Auth-protected user flow.
- Language selection-first onboarding pattern.
- Groq-backed chatbot capabilities.
- Crop-disease analysis service pipeline updates.
- Backend voice service route/service presence.
- Frontend browser-based voice input/output and greeting.

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Notes and Limitations

- Browser speech recognition and synthesis depend on browser support and user microphone/speaker permissions.
- Final verification for spoken output/input is best confirmed manually in Chrome or Edge.
- If an external TTS provider fails or lacks credits, browser TTS still allows voice output without API key.

## Next Suggested Verification Checklist

1. Log out, then log in, and confirm one-time greeting plays on Home.
2. Open chatbot, click mic, speak, and confirm text appears and sends.
3. Keep Voice ON and confirm bot replies are spoken aloud.
4. Repeat once with Voice OFF to confirm no speech playback.

## Repository Layout (High Level)

```text
krishimitra/
├── backend/
│   ├── app/
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── routes/
│   │   └── services/
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   └── context/
│   └── ...
└── README.md
```
