from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

FORUM_CATEGORIES = {
    "crop_issues",
    "weather",
    "market_prices",
    "government_schemes",
    "success_stories",
    "general",
}

_POSTS: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


async def create_post(post_data: dict[str, Any]) -> dict[str, Any]:
    category = str(post_data.get("category", "")).strip().lower()
    if category not in FORUM_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid forum category")

    post_id = str(uuid4())
    post = {
        "id": post_id,
        "author_name": str(post_data.get("author_name", "")).strip(),
        "state": str(post_data.get("state", "")).strip(),
        "district": str(post_data.get("district", "")).strip(),
        "language": str(post_data.get("language", "en")).strip().lower(),
        "category": category,
        "title": str(post_data.get("title", "")).strip(),
        "content": str(post_data.get("content", "")).strip(),
        "image_base64": str(post_data.get("image_base64", "")).strip(),
        "likes": 0,
        "replies": [],
        "created_at": _now_iso(),
    }
    _POSTS[post_id] = post
    return post


async def get_posts(
    language: str | None = None,
    category: str | None = None,
    state: str | None = None,
) -> list[dict[str, Any]]:
    posts = list(_POSTS.values())

    if language:
        target_language = language.strip().lower()
        posts = [post for post in posts if post["language"] == target_language]

    if category:
        target_category = category.strip().lower()
        posts = [post for post in posts if post["category"] == target_category]

    if state:
        target_state = state.strip().lower()
        posts = [post for post in posts if post["state"].strip().lower() == target_state]

    posts.sort(key=lambda item: item["created_at"], reverse=True)
    return posts


async def get_post_by_id(post_id: str) -> dict[str, Any]:
    post = _POSTS.get(post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


async def add_reply(post_id: str, reply_data: dict[str, Any]) -> dict[str, Any]:
    post = await get_post_by_id(post_id)

    reply = {
        "id": str(uuid4()),
        "author_name": str(reply_data.get("author_name", "")).strip(),
        "content": str(reply_data.get("content", "")).strip(),
        "created_at": _now_iso(),
        "likes": 0,
    }
    post["replies"].append(reply)

    return {
        "post_id": post_id,
        "reply": reply,
        "total_replies": len(post["replies"]),
    }


async def like_post(post_id: str) -> dict[str, Any]:
    post = await get_post_by_id(post_id)
    post["likes"] += 1

    return {
        "post_id": post_id,
        "likes": post["likes"],
    }


async def get_trending_posts() -> list[dict[str, Any]]:
    posts = list(_POSTS.values())
    posts.sort(key=lambda item: (item["likes"], len(item["replies"])), reverse=True)
    return posts[:10]


async def reset_forum_store() -> None:
    _POSTS.clear()
