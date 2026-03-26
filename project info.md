# KrishiMitra - Project Info

## Project Overview
KrishiMitra is a full-stack agriculture platform that helps farmers with decision support, market intelligence, community tools, and service workflows. It uses:
- Frontend: React + Vite
- Backend: FastAPI
- Database/Auth/Storage: Supabase

The platform supports multilingual usage, voice experiences, role-based workflows, and admin moderation capabilities.

## Project Layout Structure
```text
krishimitra/
|-- project info.md
|-- README.md
|-- backend/
|   |-- backend.md
|   |-- Dockerfile
|   |-- pytest.ini
|   |-- requirements.txt
|   |-- app/
|   |   |-- __init__.py
|   |   |-- config.py
|   |   |-- main.py
|   |   |-- scheduler.py
|   |   |-- data/
|   |   |   `-- daily_briefing_cache.json
|   |   |-- middleware/
|   |   |   |-- __init__.py
|   |   |   `-- auth_middleware.py
|   |   |-- routes/
|   |   |   |-- __init__.py
|   |   |   |-- auth.py
|   |   |   |-- chatbot.py
|   |   |   |-- crop_disease.py
|   |   |   |-- daily_briefing.py
|   |   |   |-- farm_guide.py
|   |   |   |-- forum.py
|   |   |   |-- market.py
|   |   |   |-- marketplace.py
|   |   |   |-- quiz.py
|   |   |   |-- schemes.py
|   |   |   |-- social.py
|   |   |   |-- soil.py
|   |   |   |-- sos.py
|   |   |   |-- voice.py
|   |   |   `-- weather.py
|   |   `-- services/
|   |       |-- __init__.py
|   |       |-- chatbot_service.py
|   |       |-- crop_disease_service.py
|   |       |-- daily_briefing_service.py
|   |       |-- farm_guide_service.py
|   |       |-- forum_service.py
|   |       |-- gemini_client.py
|   |       |-- groq_client.py
|   |       |-- market_service.py
|   |       |-- marketplace_service.py
|   |       |-- quiz_service.py
|   |       |-- schemes_service.py
|   |       |-- soil_service.py
|   |       |-- sos_service.py
|   |       |-- voice_service.py
|   |       `-- weather_service.py
|   |-- sql/
|   |   |-- admin_authority_features.sql
|   |   |-- labour_features.sql
|   |   |-- machinery_features.sql
|   |   |-- profile_images_storage.sql
|   |   `-- social_features.sql
|   `-- tests/
|       |-- __init__.py
|       |-- test_auth.py
|       |-- test_chatbot.py
|       |-- test_crop_disease.py
|       |-- test_farm_guide.py
|       |-- test_forum.py
|       |-- test_main.py
|       |-- test_market.py
|       |-- test_marketplace.py
|       |-- test_quiz.py
|       |-- test_schemes.py
|       |-- test_soil.py
|       |-- test_sos.py
|       `-- test_weather.py
`-- frontend/
  |-- frontend.md
  |-- README.md
  |-- eslint.config.js
  |-- index.html
  |-- package.json
  |-- vite.config.js
  |-- public/
  `-- src/
    |-- App.css
    |-- App.jsx
    |-- index.css
    |-- main.jsx
    |-- assets/
    |-- components/
    |   |-- LanguageSelector.jsx
    |   |-- LoadingSpinner.jsx
    |   |-- Navbar.jsx
    |   |-- ProtectedRoute.jsx
    |   `-- Sidebar.jsx
    |-- context/
    |   |-- AuthContext.jsx
    |   |-- LanguageContext.jsx
    |   `-- RoleContext.jsx
    |-- i18n/
    |   |-- index.js
    |   `-- locales/
    |-- lib/
    |   |-- authFetch.js
    |   `-- supabase.js
    |-- pages/
    |   |-- AuthCallback.jsx
    |   |-- Authority.jsx
    |   |-- BuyerDashboard.jsx
    |   |-- Chat.jsx
    |   |-- Chatbot.jsx
    |   |-- Community.jsx
    |   |-- CropDisease.jsx
    |   |-- FarmerBookingTracker.jsx
    |   |-- FarmGuide.jsx
    |   |-- Forum.jsx
    |   |-- Home.jsx
    |   |-- LabourHub.jsx
    |   |-- Landing.jsx
    |   |-- LanguageSelect.jsx
    |   |-- Login.jsx
    |   `-- ...
    |-- services/
    `-- utils/
```

## Core User Flow
1. Login using Google Sign-In or Phone OTP (India +91 flow).
2. New users complete language selection and profile setup.
3. Users enter app dashboard and access feature modules based on role.

## Authentication and Access
- Google OAuth login via Supabase.
- Phone OTP login via Supabase Auth (Twilio SMS provider).
- Protected routes for authenticated users.
- Session-aware routing for:
  - select-language
  - profile-setup
  - app dashboard
- Suspension enforcement:
  - Temporary suspension blocks login until suspension end date.
  - Permanent suspension blocks login indefinitely.
  - Suspension reason is shown on login screen.

## Roles Implemented
- Farmer
- Buyer
- Transporter
- Labour
- Machinery
- Admin

### Role Behavior
- Sidebar and route access adapt by active role.
- Navbar role switcher supports multi-role workflows.
- Admin role is restricted to configured admin identity.

## Feature Modules

### 1) Home Dashboard
- Personalized greeting and daily quote.
- Daily AI briefing section.
- Trending farming news cards.
- Quick action shortcuts.
- Recent updates feed.
- Admin warning banner (yellow highlight with red text) shown above greeting when warning notification exists.

### 2) Weather
- Current weather data.
- Forecast support.

### 3) Market and Prices
- Commodity market prices with location filters.
- Marketplace module for listing and trading produce.

### 4) Government Schemes
- Built-in scheme catalog with details.
- Eligibility and benefits display.
- How-to-apply links.
- Admin-added custom schemes merged into same listing.
- Custom scheme metadata shown to farmers:
  - added date
  - YouTube link

### 5) Crop Disease
- Image-based crop disease analysis.
- AI-assisted diagnosis and recommendations.

### 6) Farm Guide
- Crop-specific guidance and practical farming advice.

### 7) Chatbot and Voice
- AI chatbot for agri queries.
- Browser mic speech-to-text input.
- Browser text-to-speech for responses.
- Voice greeting flow after login.

### 8) Forum
- Community discussion posts with category/language filtering.
- Post creation modal and feed interactions.
- Admin forum posts are visibly marked with ADMIN badge.

### 9) Community / Social
- User discovery/search by name/UID.
- Friend requests and friendship tracking.
- Direct chat messaging and unread counters.
- Chat preferences (mute/favorite/block and related controls).

### 10) Notifications
- In-app notifications with real-time updates.
- Notification center in navbar.
- Read/unread management.

### 11) Profile and Profile Setup
- Profile setup with farm location details.
- Profile editing and avatar upload.
- Robust fallback handling for varied users table schemas.
- Navbar profile chip sync with current profile data.

### 12) Reports (Farmer + Admin Workflow)
- Farmers can submit:
  - platform/app issues
  - farmer-against-farmer reports using target UID
- Report fields include:
  - reason
  - details
  - optional screenshot
- Admin can:
  - view all reports
  - reply in forum as admin
  - mark reports closed

### 13) Labour Workflow
- Farmer labour requests.
- Labour-side acceptance and lifecycle tracking.

### 14) Machinery Workflow
- Image-first machinery selection.
- Modal request form with location/time/budget fields.
- Machinery provider acceptance with rate.
- Request lifecycle states:
  - open
  - accepted
  - in_progress
  - fulfilled
  - cancelled
- Status notifications and role-based action controls.

### 15) Transporter Workflow
- Booking visibility and accepted jobs flow.
- Route map related module.

### 16) SOS
- Emergency support section and helpline flow.

### 17) Quiz
- Quiz modules and answer submission flow.

### 18) Soil Health
- Soil analysis and advisory flow.

## Admin Authority Features
Admin has an Authority section to moderate accounts:
- Search user by UID.
- Open searched user profile.
- Add friend (normal social behavior remains intact).
- Warn farmer (requires reason).
- Suspend temporarily for 7 days (requires reason).
- Suspend permanently (requires reason).

### Admin Action Effects
- Warn:
  - Warning notification delivered to user.
  - Warning appears on user Home page in highlighted banner.
- Temporary suspension:
  - User login blocked until suspension expires.
  - Reason displayed on login screen.
- Permanent suspension:
  - User login blocked permanently.
  - Reason displayed on login screen.

## Data and Backend Capabilities
- FastAPI modular routing for feature domains.
- Supabase-backed persistence for user, social, reports, notifications, and machinery domains.
- SQL migration scripts available under backend/sql for setup and feature evolution.
- Compatibility patterns added for schema variance across environments.

## Security and Reliability Patterns
- ProtectedRoute gating for app sections.
- Token/session-aware profile updates.
- Fallback logic when backend endpoint fails (direct Supabase write fallback in key flows).
- Schema-tolerant client behavior for missing optional columns.
- Non-blocking notification failures to avoid breaking core business flows.

## Current Project Scope Summary
KrishiMitra currently operates as a role-based agri-super-app with:
- AI assistance
- community and messaging
- market and services workflows
- scheme discovery plus admin-added scheme publishing
- moderation and authority tooling
- multilingual and voice-enabled user experience
