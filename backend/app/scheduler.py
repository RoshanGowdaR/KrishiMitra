import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


@scheduler.scheduled_job("cron", hour=6, minute=0)
async def refresh_market_cache() -> None:
    from app.services.market_service import _cache, _cache_time

    _cache.clear()
    _cache_time.clear()
    logger.info("Market prices cache cleared at 6AM - fresh data will load")


@scheduler.scheduled_job("cron", hour=0, minute=0, timezone="Asia/Kolkata")
async def refresh_daily_farming_briefing() -> None:
    from app.services.daily_briefing_service import refresh_daily_briefing

    payload = await refresh_daily_briefing()
    logger.info(
        "Daily farming briefing refreshed for %s via %s",
        payload.get("date"),
        payload.get("source"),
    )


def start_scheduler() -> None:
    scheduler.start()
    logger.info("KrishiMitra daily scheduler started")
