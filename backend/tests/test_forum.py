import asyncio

from fastapi.testclient import TestClient

from app.main import app
from app.services.forum_service import reset_forum_store

client = TestClient(app)


def _post_payload() -> dict:
    return {
        "author_name": "Ramesh",
        "state": "Karnataka",
        "district": "Hassan",
        "language": "en",
        "category": "crop_issues",
        "title": "Leaf yellowing in paddy",
        "content": "My paddy leaves are yellowing after rain. Need suggestions.",
        "image_base64": "",
    }


def _create_post() -> dict:
    response = client.post("/api/v1/forum/posts", json=_post_payload())
    assert response.status_code == 201
    return response.json()


def test_create_post_returns_201_with_correct_fields() -> None:
    asyncio.run(reset_forum_store())

    response = client.post("/api/v1/forum/posts", json=_post_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["author_name"] == "Ramesh"
    assert body["category"] == "crop_issues"
    assert "id" in body
    assert "created_at" in body


def test_get_posts_returns_list() -> None:
    asyncio.run(reset_forum_store())
    _create_post()

    response = client.get("/api/v1/forum/posts")

    assert response.status_code == 200
    posts = response.json()["posts"]
    assert isinstance(posts, list)
    assert len(posts) >= 1


def test_filter_by_category_works() -> None:
    asyncio.run(reset_forum_store())
    _create_post()

    alt_payload = _post_payload()
    alt_payload["category"] = "weather"
    client.post("/api/v1/forum/posts", json=alt_payload)

    response = client.get("/api/v1/forum/posts?category=crop_issues")

    assert response.status_code == 200
    posts = response.json()["posts"]
    assert len(posts) == 1
    assert posts[0]["category"] == "crop_issues"


def test_filter_by_language_works() -> None:
    asyncio.run(reset_forum_store())
    _create_post()

    alt_payload = _post_payload()
    alt_payload["language"] = "hi"
    client.post("/api/v1/forum/posts", json=alt_payload)

    response = client.get("/api/v1/forum/posts?language=hi")

    assert response.status_code == 200
    posts = response.json()["posts"]
    assert len(posts) == 1
    assert posts[0]["language"] == "hi"


def test_get_post_by_invalid_id_returns_404() -> None:
    response = client.get("/api/v1/forum/posts/invalid-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Post not found"


def test_add_reply_returns_200() -> None:
    asyncio.run(reset_forum_store())
    created = _create_post()

    response = client.post(
        f"/api/v1/forum/posts/{created['id']}/reply",
        json={"author_name": "Sita", "content": "Check nitrogen and drainage."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total_replies"] == 1
    assert body["reply"]["author_name"] == "Sita"


def test_like_post_increments_likes() -> None:
    asyncio.run(reset_forum_store())
    created = _create_post()

    response = client.post(f"/api/v1/forum/posts/{created['id']}/like")

    assert response.status_code == 200
    assert response.json()["likes"] == 1


def test_trending_returns_list() -> None:
    asyncio.run(reset_forum_store())
    created = _create_post()
    client.post(f"/api/v1/forum/posts/{created['id']}/like")
    client.post(
        f"/api/v1/forum/posts/{created['id']}/reply",
        json={"author_name": "Sita", "content": "Use balanced NPK."},
    )

    response = client.get("/api/v1/forum/trending")

    assert response.status_code == 200
    trending = response.json()["trending_posts"]
    assert isinstance(trending, list)
    assert len(trending) >= 1
