from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.market_service import get_available_commodities, get_commodity_prices

router = APIRouter(tags=["Market"])


class MarketPriceResponse(BaseModel):
    state: str
    district: str
    market: str
    commodity: str
    variety: str
    min_price: str | float
    max_price: str | float
    modal_price: str | float
    date: str


class MarketPricesListResponse(BaseModel):
    prices: list[MarketPriceResponse]


class CommodityListResponse(BaseModel):
    commodities: list[str]


@router.get("/market/prices", response_model=MarketPricesListResponse)
async def read_market_prices(
    state: str | None = Query(default=None),
    district: str | None = Query(default=None),
    commodity: str | None = Query(default=None, min_length=1),
) -> MarketPricesListResponse:
    prices = await get_commodity_prices(state=state, district=district, commodity=commodity)
    return MarketPricesListResponse(prices=[MarketPriceResponse(**item) for item in prices])


@router.get("/market/commodities", response_model=CommodityListResponse)
async def read_market_commodities(
    state: str | None = Query(default=None),
    district: str | None = Query(default=None),
) -> CommodityListResponse:
    commodities = await get_available_commodities(state=state, district=district)
    return CommodityListResponse(commodities=commodities)
