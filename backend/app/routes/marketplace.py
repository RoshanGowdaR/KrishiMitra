from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field

from app.services.marketplace_service import (
    create_listing,
    delete_listing,
    express_interest,
    get_listing_by_id,
    get_listings,
    update_listing,
)

router = APIRouter(tags=["Marketplace"])


class ListingBase(BaseModel):
    farmer_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=8)
    state: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    commodity: str = Field(..., min_length=2)
    variety: str = Field(..., min_length=1)
    quantity_kg: float = Field(..., gt=0)
    price_per_kg: float = Field(..., gt=0)
    description: str = Field(..., min_length=3)
    available_from: str = Field(..., min_length=6)
    status: str = Field(default="active", min_length=3)
    images_base64: list[str] = Field(default_factory=list)


class ListingCreateRequest(ListingBase):
    pass


class ListingUpdateRequest(BaseModel):
    farmer_name: str | None = None
    phone: str | None = None
    state: str | None = None
    district: str | None = None
    commodity: str | None = None
    variety: str | None = None
    quantity_kg: float | None = Field(default=None, gt=0)
    price_per_kg: float | None = Field(default=None, gt=0)
    description: str | None = None
    available_from: str | None = None
    status: str | None = None
    images_base64: list[str] | None = None


class ListingResponse(ListingBase):
    id: str
    listing_date: str


class ListingsResponse(BaseModel):
    listings: list[ListingResponse]


class DeleteResponse(BaseModel):
    message: str


class InterestRequest(BaseModel):
    buyer_name: str = Field(..., min_length=2)
    buyer_phone: str = Field(..., min_length=8)
    quantity_kg: float = Field(..., gt=0)
    message: str = Field(default="", min_length=0)


class InterestResponse(BaseModel):
    listing_id: str
    farmer_name: str
    farmer_phone: str
    buyer_name: str
    buyer_phone: str
    quantity_kg: float
    message: str
    status: str


@router.post(
    "/marketplace/listings",
    response_model=ListingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_marketplace_listing(payload: ListingCreateRequest) -> ListingResponse:
    listing = await create_listing(payload.model_dump())
    return ListingResponse(**listing)


@router.get("/marketplace/listings", response_model=ListingsResponse)
async def read_marketplace_listings(
    state: str | None = Query(default=None),
    commodity: str | None = Query(default=None),
    min_price: float | None = Query(default=None, gt=0),
    max_price: float | None = Query(default=None, gt=0),
) -> ListingsResponse:
    listings = await get_listings(
        state=state,
        commodity=commodity,
        min_price=min_price,
        max_price=max_price,
    )
    return ListingsResponse(listings=[ListingResponse(**item) for item in listings])


@router.get("/marketplace/listings/{listing_id}", response_model=ListingResponse)
async def read_marketplace_listing(listing_id: str) -> ListingResponse:
    listing = await get_listing_by_id(listing_id)
    return ListingResponse(**listing)


@router.put("/marketplace/listings/{listing_id}", response_model=ListingResponse)
async def update_marketplace_listing(
    listing_id: str,
    payload: ListingUpdateRequest,
) -> ListingResponse:
    listing = await update_listing(listing_id=listing_id, data=payload.model_dump(exclude_none=True))
    return ListingResponse(**listing)


@router.delete("/marketplace/listings/{listing_id}", response_model=DeleteResponse)
async def delete_marketplace_listing(listing_id: str) -> DeleteResponse:
    result = await delete_listing(listing_id)
    return DeleteResponse(**result)


@router.post(
    "/marketplace/listings/{listing_id}/interest",
    response_model=InterestResponse,
)
async def create_marketplace_interest(
    listing_id: str,
    payload: InterestRequest,
) -> InterestResponse:
    result = await express_interest(listing_id=listing_id, buyer_info=payload.model_dump())
    return InterestResponse(**result)
