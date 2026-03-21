from typing import Literal

from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field

from app.services.forum_service import (
    add_reply,
    create_post,
    get_post_by_id,
    get_posts,
    get_trending_posts,
    like_post,
)

router = APIRouter(tags=["Forum"])


class ReplyResponse(BaseModel):
    id: str
    author_name: str
    content: str
    created_at: str
    likes: int


class PostBase(BaseModel):
    author_name: str = Field(..., min_length=2)
    state: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    language: str = Field(default="en", min_length=2, max_length=5)
    category: Literal[
        "crop_issues",
        "weather",
        "market_prices",
        "government_schemes",
        "success_stories",
        "general",
    ]
    title: str = Field(..., min_length=3)
    content: str = Field(..., min_length=5)
    image_base64: str = Field(default="")


class PostCreateRequest(PostBase):
    pass


class PostResponse(PostBase):
    id: str
    likes: int
    replies: list[ReplyResponse]
    created_at: str


class PostsResponse(BaseModel):
    posts: list[PostResponse]


class AddReplyRequest(BaseModel):
    author_name: str = Field(..., min_length=2)
    content: str = Field(..., min_length=2)


class AddReplyResponse(BaseModel):
    post_id: str
    reply: ReplyResponse
    total_replies: int


class LikePostResponse(BaseModel):
    post_id: str
    likes: int


class TrendingPostsResponse(BaseModel):
    trending_posts: list[PostResponse]


@router.post("/forum/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_forum_post(payload: PostCreateRequest) -> PostResponse:
    post = await create_post(payload.model_dump())
    return PostResponse(**post)


@router.get("/forum/posts", response_model=PostsResponse)
async def read_forum_posts(
    language: str | None = Query(default=None),
    category: str | None = Query(default=None),
    state: str | None = Query(default=None),
) -> PostsResponse:
    posts = await get_posts(language=language, category=category, state=state)
    return PostsResponse(posts=[PostResponse(**post) for post in posts])


@router.get("/forum/posts/{post_id}", response_model=PostResponse)
async def read_forum_post_by_id(post_id: str) -> PostResponse:
    post = await get_post_by_id(post_id)
    return PostResponse(**post)


@router.post("/forum/posts/{post_id}/reply", response_model=AddReplyResponse)
async def create_forum_reply(post_id: str, payload: AddReplyRequest) -> AddReplyResponse:
    result = await add_reply(post_id=post_id, reply_data=payload.model_dump())
    return AddReplyResponse(**result)


@router.post("/forum/posts/{post_id}/like", response_model=LikePostResponse)
async def create_forum_like(post_id: str) -> LikePostResponse:
    result = await like_post(post_id)
    return LikePostResponse(**result)


@router.get("/forum/trending", response_model=TrendingPostsResponse)
async def read_trending_posts() -> TrendingPostsResponse:
    posts = await get_trending_posts()
    return TrendingPostsResponse(trending_posts=[PostResponse(**post) for post in posts])
