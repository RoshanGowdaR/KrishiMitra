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


def start_scheduler() -> None:
    scheduler.start()
    logger.info("KrishiMitra daily scheduler started")
