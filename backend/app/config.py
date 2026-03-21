import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE)


@dataclass(frozen=True)
class Settings:
    openweather_api_key: str = os.getenv("OPENWEATHER_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    firebase_credentials: str = os.getenv("FIREBASE_CREDENTIALS", "")
    data_gov_api_key: str = os.getenv("DATA_GOV_API_KEY", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
