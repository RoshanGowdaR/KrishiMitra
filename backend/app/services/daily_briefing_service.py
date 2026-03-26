import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from app.services.groq_client import groq_client
from app.services.chatbot_service import translate_text

logger = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")
CACHE_FILE = Path(__file__).resolve().parent.parent / "data" / "daily_briefing_cache.json"

_briefing_cache: dict | None = None
_briefing_cache_date: str | None = None
_cache_lock = asyncio.Lock()


def _is_rich_briefing(payload: dict | None) -> bool:
    if not payload or not isinstance(payload, dict):
        return False

    news = payload.get("news")
    if not isinstance(news, list) or len(news) < 3:
        return False

    for item in news[:3]:
        if not isinstance(item, dict):
            return False
        details = str(item.get("details", "")).strip()
        if len(details.split()) < 40:
            return False

    return True


def _normalize_language(language: str | None) -> str:
    code = str(language or "en").strip().lower()
    if not code:
        return "en"
    return code


def _fallback_briefing() -> dict:
    return {
        "quote": "Farming is hope made visible: every seed is a decision that tomorrow can be better.",
        "news": [
            {
                "title": "Soil-first practices continue to grow",
                "summary": "Soil health programs are helping farms retain moisture and reduce crop stress.",
                "why_it_matters": "Better soil means stronger roots, lower fertilizer waste, and more stable harvest outcomes.",
                "details": "Across multiple regions, extension teams are guiding farmers to build soil organic matter through compost, residue incorporation, and balanced micronutrient plans before sowing. This improves water-holding capacity, supports healthier root development, and reduces sudden nutrient stress during sensitive growth stages. Over time, farms with better soil structure often see more stable yields, lower corrective input costs, and stronger crop recovery when rainfall patterns become irregular.",
            },
            {
                "title": "Water-saving irrigation gains momentum",
                "summary": "Drip and timed irrigation are cutting water use without harming crop growth.",
                "why_it_matters": "Lower water usage means reduced pumping cost and more reliable irrigation during dry spells.",
                "details": "Farmers are increasingly shifting toward low-pressure drip setups and moisture-based irrigation scheduling instead of fixed-time watering. This helps deliver water directly to the root zone, reduces evaporation losses, and lowers electricity or diesel costs from pumping. Better timing also prevents waterlogging stress and nutrient leaching, which can protect crop vigor during flowering and grain-filling periods while preserving limited water resources for longer dry intervals.",
            },
            {
                "title": "Digital advisory tools become mainstream",
                "summary": "Farm advisory apps are now widely used for alerts and crop planning.",
                "why_it_matters": "Timely advice improves pest response, input timing, and better market-selling decisions.",
                "details": "Digital advisory platforms are helping farmers receive early pest alerts, localized weather risk updates, and mandi movement signals before key decisions are made. With this information, growers can schedule spraying, irrigation, and harvest windows more precisely instead of reacting after damage appears. Even simple daily checks on a smartphone can improve planning quality, reduce avoidable input use, and support better sale timing for improved price realization.",
            },
        ],
        "source": "fallback",
    }


def _load_cached_briefing_from_disk() -> dict | None:
    if not CACHE_FILE.exists():
        return None

    try:
        raw = CACHE_FILE.read_text(encoding="utf-8")
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            return None
        if "date" not in payload or "quote" not in payload or "news" not in payload:
            return None
        return payload
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to read daily briefing cache file: %s", exc)
        return None


def _save_cached_briefing_to_disk(payload: dict) -> None:
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(
            json.dumps(payload, ensure_ascii=True, indent=2),
            encoding="utf-8",
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to write daily briefing cache file: %s", exc)


def _extract_json(raw_text: str) -> dict:
    text = (raw_text or "").strip()

    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in Groq response")

    candidate = text[start : end + 1]
    return json.loads(candidate)


def _normalize_briefing(payload: dict) -> dict:
    quote = str(payload.get("quote", "")).strip()
    news_items = payload.get("news", [])

    if not quote:
        raise ValueError("Missing quote in daily briefing")

    normalized_news = []
    for item in news_items:
        if len(normalized_news) >= 3:
            break
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        summary = str(item.get("summary", "")).strip()
        why_it_matters = str(item.get("why_it_matters", "")).strip()
        details = str(item.get("details", "")).strip()
        if title and summary and why_it_matters and details:
            if len(details.split()) < 40:
                raise ValueError("News details are too short; expected paragraph-level core info")
            normalized_news.append(
                {
                    "title": title,
                    "summary": summary,
                    "why_it_matters": why_it_matters,
                    "details": details,
                }
            )

    if len(normalized_news) < 3:
        raise ValueError("Daily briefing must include exactly 3 valid news items")

    return {
        "quote": quote,
        "news": normalized_news,
        "source": "groq",
    }


async def _generate_from_groq() -> dict:
    today_text = datetime.now(IST).strftime("%Y-%m-%d")
    prompt = (
        "You are an agriculture news and motivation assistant. "
        "Return strict JSON only with this exact schema: "
        "{\"quote\": string, \"news\": [{\"title\": string, \"summary\": string, \"why_it_matters\": string, \"details\": string}, {\"title\": string, \"summary\": string, \"why_it_matters\": string, \"details\": string}, {\"title\": string, \"summary\": string, \"why_it_matters\": string, \"details\": string}]}. "
        "Rules: quote must be inspirational and practical for farmers, under 26 words. "
        "Each news item must be a current high-level farming/agriculture trend for India or global agriculture. "
        "Title under 10 words, summary under 22 words, why_it_matters under 24 words. "
        "Details must be one clear paragraph of 70-110 words with core practical context, impact on farmers, and likely on-field decision value. "
        "Write in simple language that small and mid-scale farmers can understand. "
        "Do not include markdown, explanation, or extra keys. "
        f"Date context: {today_text}."
    )

    content = await groq_client.chat(
        messages=[
            {
                "role": "system",
                "content": "Return only valid JSON without markdown.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.55,
        max_tokens=350,
    )

    payload = _extract_json(content)
    return _normalize_briefing(payload)


async def _translate_briefing_payload(payload: dict, language: str) -> dict:
    lang = _normalize_language(language)
    if lang == "en":
        translated = dict(payload)
        translated["language"] = "en"
        return translated

    quote = await translate_text(str(payload.get("quote", "")), lang)
    translated_news = []
    for item in payload.get("news", [])[:3]:
        translated_news.append(
            {
                "title": await translate_text(str(item.get("title", "")), lang),
                "summary": await translate_text(str(item.get("summary", "")), lang),
                "why_it_matters": await translate_text(str(item.get("why_it_matters", "")), lang),
                "details": await translate_text(str(item.get("details", "")), lang),
            }
        )

    translated = {
        "quote": quote,
        "news": translated_news,
        "source": payload.get("source", "groq"),
        "language": lang,
    }
    return translated


async def refresh_daily_briefing(language: str = "en") -> dict:
    global _briefing_cache, _briefing_cache_date

    lang = _normalize_language(language)
    today = datetime.now(IST).date().isoformat()
    cache_key = f"{today}:{lang}"

    async with _cache_lock:
        try:
            base = await _generate_from_groq()
            data = await _translate_briefing_payload(base, lang)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to refresh daily briefing from Groq: %s", exc)
            data = _fallback_briefing()
            if lang != "en":
                try:
                    data = await _translate_briefing_payload(data, lang)
                except Exception as translate_exc:  # noqa: BLE001
                    logger.warning("Fallback briefing translation failed: %s", translate_exc)
                    data["language"] = "en"

        data["date"] = today
        data["generated_at"] = datetime.now(IST).isoformat()
        if not isinstance(_briefing_cache, dict):
            _briefing_cache = {}
        _briefing_cache[cache_key] = data
        _briefing_cache_date = today
        _save_cached_briefing_to_disk(data)

        return dict(data)


async def get_daily_briefing(force_refresh: bool = False, language: str = "en") -> dict:
    global _briefing_cache, _briefing_cache_date

    lang = _normalize_language(language)
    today = datetime.now(IST).date().isoformat()
    cache_key = f"{today}:{lang}"

    if not _briefing_cache:
        disk_payload = _load_cached_briefing_from_disk()
        if disk_payload:
            disk_lang = _normalize_language(disk_payload.get("language", "en"))
            _briefing_cache = {f"{disk_payload.get('date', today)}:{disk_lang}": disk_payload}
            _briefing_cache_date = str(disk_payload.get("date", ""))

    cached = _briefing_cache.get(cache_key) if isinstance(_briefing_cache, dict) else None
    if not force_refresh and cached and _briefing_cache_date == today and _is_rich_briefing(cached):
        return dict(cached)

    if not force_refresh and lang != "en" and isinstance(_briefing_cache, dict):
        english_key = f"{today}:en"
        english_cached = _briefing_cache.get(english_key)
        if english_cached and _is_rich_briefing(english_cached):
            translated = await _translate_briefing_payload(english_cached, lang)
            translated["date"] = today
            translated["generated_at"] = english_cached.get("generated_at", datetime.now(IST).isoformat())
            _briefing_cache[cache_key] = translated
            return dict(translated)

    return await refresh_daily_briefing(language=lang)
