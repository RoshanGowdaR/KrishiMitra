import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE)


@dataclass(frozen=True)
class Settings:
    openweather_api_key: str = os.getenv("OPENWEATHER_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_api_key_1: str = os.getenv("GEMINI_API_KEY_1", "")
    gemini_api_key_2: str = os.getenv("GEMINI_API_KEY_2", "")
    gemini_api_key_3: str = os.getenv("GEMINI_API_KEY_3", "")
    groq_api_key_1: str = os.getenv("GROQ_API_KEY_1", "")
    groq_api_key_2: str = os.getenv("GROQ_API_KEY_2", "")
    groq_api_key_3: str = os.getenv("GROQ_API_KEY_3", "")
    google_sheets_api_key: str = os.getenv("GOOGLE_SHEETS_API_KEY", "")
    google_sheet_id: str = os.getenv("GOOGLE_SHEET_ID", "")
    firebase_credentials: str = os.getenv("FIREBASE_CREDENTIALS", "")
    data_gov_api_key: str = os.getenv("DATA_GOV_API_KEY", "")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


@lru_cache
def get_supabase_client() -> Client:
    cfg = get_settings()
    supabase_url = cfg.supabase_url
    supabase_key = cfg.supabase_anon_key or cfg.supabase_key

    if not supabase_url or not supabase_key:
        raise RuntimeError("Supabase configuration is missing")

    return create_client(supabase_url, supabase_key)
