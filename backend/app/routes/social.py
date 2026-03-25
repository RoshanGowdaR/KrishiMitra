from datetime import datetime, timedelta, timezone
import hashlib
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.config import get_supabase_client
from app.middleware.auth_middleware import get_current_user

router = APIRouter(tags=["Social"])

ADMIN_EMAILS = {"gowdaroshan49@gmail.com"}
MAX_INLINE_MEDIA_CHARS = 4_000_000


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _build_uid(user_id: str) -> str:
    digest = hashlib.sha1(user_id.encode("utf-8")).hexdigest()[:10].upper()
    return f"KM{digest}"


def _is_social_schema_error(exc: Exception) -> bool:
    message = str(exc).lower()
    has_missing_signal = (
        "does not exist" in message
        or "could not find" in message
        or "schema cache" in message
    )
    if not has_missing_signal:
        return False
    patterns = [
        "user_uid",
        "role",
        "account_status",
        "profile_photo_url",
        "friendships",
        "direct_messages",
        "user_reports",
        "custom_schemes",
    ]
    return any(pattern in message for pattern in patterns)


def _raise_schema_not_ready() -> None:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Social features are not ready yet. Apply backend/sql/social_features.sql in Supabase and retry.",
    )


def _require_admin(current_user: dict[str, Any]) -> None:
    if current_user.get("role") == "admin" or current_user.get("email") in ADMIN_EMAILS:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _public_user(record: dict[str, Any], report_count: int = 0) -> dict[str, Any]:
    return {
        "id": record.get("id"),
        "uid": record.get("user_uid"),
        "name": record.get("name"),
        "email": record.get("email"),
        "state": record.get("state"),
        "district": record.get("district"),
        "taluk": record.get("taluk"),
        "village": record.get("village"),
        "preferred_language": record.get("preferred_language"),
        "profile_photo_url": record.get("profile_photo_url"),
        "role": record.get("role") or "farmer",
        "account_status": record.get("account_status") or "active",
        "report_count": report_count,
        "reported_warning": report_count >= 5,
    }


def _ensure_user_row(supabase, current_user: dict[str, Any]) -> dict[str, Any]:
    uid = current_user.get("user_uid") or _build_uid(current_user["id"])
    role = "admin" if current_user.get("email") in ADMIN_EMAILS else (current_user.get("role") or "farmer")

    payload = {
        "id": current_user["id"],
        "user_uid": uid,
        "email": current_user.get("email"),
        "name": current_user.get("name") or (current_user.get("email") or "Farmer").split("@")[0],
        "state": current_user.get("state"),
        "district": current_user.get("district"),
        "taluk": current_user.get("taluk"),
        "village": current_user.get("village"),
        "preferred_language": current_user.get("preferred_language") or "en",
        "profile_photo_url": current_user.get("profile_photo_url"),
        "role": role,
        "account_status": current_user.get("account_status") or "active",
        "updated_at": _now_iso(),
    }

    try:
        response = supabase.table("users").upsert(payload, on_conflict="id").execute()
    except Exception as exc:
        if _is_social_schema_error(exc):
            _raise_schema_not_ready()
        raise
    if not response.data:
        raise HTTPException(status_code=500, detail="Unable to ensure user profile row")
    return response.data[0]


def _get_report_count(supabase, target_uid: str) -> int:
    try:
        result = (
            supabase
            .table("user_reports")
            .select("id", count="exact")
            .eq("target_uid", target_uid)
            .execute()
        )
    except Exception as exc:
        if _is_social_schema_error(exc):
            return 0
        raise
    return int(getattr(result, "count", 0) or 0)


def _fetch_user_by_uid(supabase, uid: str) -> dict[str, Any] | None:
    try:
        response = (
            supabase
            .table("users")
            .select("id, user_uid, email, name, state, district, taluk, village, preferred_language, profile_photo_url, role, account_status")
            .eq("user_uid", uid)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        if _is_social_schema_error(exc):
            _raise_schema_not_ready()
        raise
    if response.data:
        return response.data[0]
    return None


def _are_friends(supabase, my_uid: str, peer_uid: str) -> bool:
    a = (
        supabase
        .table("friendships")
        .select("id")
        .eq("requester_uid", my_uid)
        .eq("target_uid", peer_uid)
        .eq("status", "accepted")
        .limit(1)
        .execute()
    )
    if a.data:
        return True

    b = (
        supabase
        .table("friendships")
        .select("id")
        .eq("requester_uid", peer_uid)
        .eq("target_uid", my_uid)
        .eq("status", "accepted")
        .limit(1)
        .execute()
    )
    return bool(b.data)


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    state: str | None = None
    district: str | None = None
    taluk: str | None = None
    village: str | None = None
    preferred_language: str | None = None


class PhotoUpdateRequest(BaseModel):
    photo_data_url: str = Field(..., min_length=20)


class FriendRequestCreate(BaseModel):
    target_uid: str = Field(..., min_length=4)


class FriendRequestDecision(BaseModel):
    request_id: str
    action: Literal["accept", "reject"]


class DirectMessageSend(BaseModel):
    to_uid: str
    cipher_text: str = Field(..., min_length=8)
    media_url: str | None = None
    media_type: Literal["image", "video", "none"] = "none"
    disappears_24h: bool = False


class UserReportCreate(BaseModel):
    target_uid: str
    reason: str
    details: str | None = None


class AdminUserActionRequest(BaseModel):
    action: Literal["suspend", "block", "restore", "delete"]


class AdminSchemeCreate(BaseModel):
    title: str
    description: str
    language: str = "en"
    deadline: str | None = None
    ministry: str | None = None


@router.get("/social/me")
def get_social_me(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)
    report_count = _get_report_count(supabase, me["user_uid"])
    return {"user": _public_user(me, report_count=report_count)}


@router.put("/social/me")
def update_social_me(payload: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)

    updates = {
        "updated_at": _now_iso(),
    }
    for key, value in payload.model_dump().items():
        if value is not None:
            updates[key] = value

    response = supabase.table("users").update(updates).eq("id", me["id"]).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Unable to update profile")

    updated = response.data[0]
    report_count = _get_report_count(supabase, updated["user_uid"])
    return {"user": _public_user(updated, report_count=report_count)}


@router.post("/social/me/photo")
def upload_profile_photo(payload: PhotoUpdateRequest, current_user: dict = Depends(get_current_user)):
    if len(payload.photo_data_url) > MAX_INLINE_MEDIA_CHARS:
        raise HTTPException(status_code=400, detail="Profile photo exceeds size limit")

    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)

    response = (
        supabase
        .table("users")
        .update({"profile_photo_url": payload.photo_data_url, "updated_at": _now_iso()})
        .eq("id", me["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=500, detail="Unable to save profile photo")

    report_count = _get_report_count(supabase, me["user_uid"])
    return {"user": _public_user(response.data[0], report_count=report_count)}


@router.get("/social/users/search")
def search_users(query: str = Query(..., min_length=2), current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    _ensure_user_row(supabase, current_user)

    q = query.strip()
    results: list[dict[str, Any]] = []
    seen: set[str] = set()

    uid_match = _fetch_user_by_uid(supabase, q.upper())
    if uid_match:
        seen.add(uid_match["user_uid"])
        results.append(_public_user(uid_match, report_count=_get_report_count(supabase, uid_match["user_uid"])))

    for field in ["name", "email", "village", "district"]:
        try:
            response = (
                supabase
                .table("users")
                .select("id, user_uid, email, name, state, district, taluk, village, preferred_language, profile_photo_url, role, account_status")
                .ilike(field, f"%{q}%")
                .limit(12)
                .execute()
            )
        except Exception:
            continue

        for item in response.data or []:
            uid = item.get("user_uid")
            if not uid or uid in seen:
                continue
            seen.add(uid)
            results.append(_public_user(item, report_count=_get_report_count(supabase, uid)))

    return {"users": results[:20]}


@router.get("/social/users/{uid}")
def get_public_profile(uid: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    _ensure_user_row(supabase, current_user)

    target = _fetch_user_by_uid(supabase, uid.strip().upper())
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    return {"user": _public_user(target, report_count=_get_report_count(supabase, target["user_uid"]))}


@router.post("/social/friends/request")
def create_friend_request(payload: FriendRequestCreate, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)
    target_uid = payload.target_uid.strip().upper()

    if target_uid == me["user_uid"]:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")

    target = _fetch_user_by_uid(supabase, target_uid)
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    existing_a = (
        supabase.table("friendships")
        .select("id, status")
        .eq("requester_uid", me["user_uid"])
        .eq("target_uid", target_uid)
        .limit(1)
        .execute()
    )
    if existing_a.data:
        raise HTTPException(status_code=400, detail=f"Request already {existing_a.data[0]['status']}")

    existing_b = (
        supabase.table("friendships")
        .select("id, status")
        .eq("requester_uid", target_uid)
        .eq("target_uid", me["user_uid"])
        .limit(1)
        .execute()
    )
    if existing_b.data:
        raise HTTPException(status_code=400, detail=f"Existing request is {existing_b.data[0]['status']}")

    response = (
        supabase
        .table("friendships")
        .insert({
            "requester_uid": me["user_uid"],
            "target_uid": target_uid,
            "status": "pending",
            "created_at": _now_iso(),
        })
        .execute()
    )

    return {"request": response.data[0] if response.data else {"status": "pending"}}


@router.post("/social/friends/respond")
def respond_friend_request(payload: FriendRequestDecision, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)

    request_row = (
        supabase
        .table("friendships")
        .select("id, requester_uid, target_uid, status")
        .eq("id", payload.request_id)
        .eq("target_uid", me["user_uid"])
        .limit(1)
        .execute()
    )
    if not request_row.data:
        raise HTTPException(status_code=404, detail="Friend request not found")

    decision = "accepted" if payload.action == "accept" else "rejected"
    updated = (
        supabase
        .table("friendships")
        .update({"status": decision, "responded_at": _now_iso()})
        .eq("id", payload.request_id)
        .execute()
    )
    return {"request": updated.data[0] if updated.data else {"status": decision}}


@router.get("/social/friends/requests")
def list_friend_requests(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)

    incoming = (
        supabase
        .table("friendships")
        .select("id, requester_uid, target_uid, status, created_at, responded_at")
        .eq("target_uid", me["user_uid"])
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )

    outgoing = (
        supabase
        .table("friendships")
        .select("id, requester_uid, target_uid, status, created_at, responded_at")
        .eq("requester_uid", me["user_uid"])
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )

    return {"incoming": incoming.data or [], "outgoing": outgoing.data or []}


@router.get("/social/friends")
def list_friends(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)

    a = (
        supabase
        .table("friendships")
        .select("requester_uid, target_uid")
        .eq("status", "accepted")
        .eq("requester_uid", me["user_uid"])
        .execute()
    )
    b = (
        supabase
        .table("friendships")
        .select("requester_uid, target_uid")
        .eq("status", "accepted")
        .eq("target_uid", me["user_uid"])
        .execute()
    )

    friend_uids: set[str] = set()
    for row in a.data or []:
        friend_uids.add(row["target_uid"])
    for row in b.data or []:
        friend_uids.add(row["requester_uid"])

    friends: list[dict[str, Any]] = []
    for uid in sorted(friend_uids):
        record = _fetch_user_by_uid(supabase, uid)
        if record:
            friends.append(_public_user(record, report_count=_get_report_count(supabase, uid)))

    return {"friends": friends}


@router.post("/social/messages/send")
def send_direct_message(payload: DirectMessageSend, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)
    to_uid = payload.to_uid.strip().upper()

    if not _are_friends(supabase, me["user_uid"], to_uid):
        raise HTTPException(status_code=403, detail="You can only message accepted friends")

    if payload.media_url and len(payload.media_url) > MAX_INLINE_MEDIA_CHARS:
        raise HTTPException(status_code=400, detail="Media payload too large")

    expires_at = None
    if payload.disappears_24h:
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat().replace("+00:00", "Z")

    response = (
        supabase
        .table("direct_messages")
        .insert({
            "sender_uid": me["user_uid"],
            "receiver_uid": to_uid,
            "cipher_text": payload.cipher_text,
            "media_url": payload.media_url,
            "media_type": payload.media_type,
            "expires_at": expires_at,
            "created_at": _now_iso(),
        })
        .execute()
    )

    return {"message": response.data[0] if response.data else {"ok": True}}


@router.get("/social/messages/{peer_uid}")
def get_direct_messages(
    peer_uid: str,
    limit: int = Query(default=200, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)
    other_uid = peer_uid.strip().upper()

    if not _are_friends(supabase, me["user_uid"], other_uid):
        raise HTTPException(status_code=403, detail="You can only view chats with accepted friends")

    a = (
        supabase
        .table("direct_messages")
        .select("id, sender_uid, receiver_uid, cipher_text, media_url, media_type, created_at, expires_at")
        .eq("sender_uid", me["user_uid"])
        .eq("receiver_uid", other_uid)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    b = (
        supabase
        .table("direct_messages")
        .select("id, sender_uid, receiver_uid, cipher_text, media_url, media_type, created_at, expires_at")
        .eq("sender_uid", other_uid)
        .eq("receiver_uid", me["user_uid"])
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )

    now = _now_iso()
    merged = sorted((a.data or []) + (b.data or []), key=lambda item: item.get("created_at") or "")
    visible = [
        row
        for row in merged
        if not row.get("expires_at") or row["expires_at"] > now
    ]

    return {"messages": visible[-limit:]}


@router.post("/social/reports")
def create_report(payload: UserReportCreate, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)
    target_uid = payload.target_uid.strip().upper()

    if target_uid == me["user_uid"]:
        raise HTTPException(status_code=400, detail="Cannot report yourself")

    target = _fetch_user_by_uid(supabase, target_uid)
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    result = (
        supabase
        .table("user_reports")
        .insert({
            "reporter_uid": me["user_uid"],
            "target_uid": target_uid,
            "reason": payload.reason.strip(),
            "details": (payload.details or "").strip() or None,
            "created_at": _now_iso(),
            "status": "open",
        })
        .execute()
    )

    report_count = _get_report_count(supabase, target_uid)
    return {
        "report": result.data[0] if result.data else {"status": "open"},
        "target_report_count": report_count,
        "warning": report_count >= 5,
    }


@router.get("/social/reports/mine")
def list_my_reports(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    me = _ensure_user_row(supabase, current_user)

    reports = (
        supabase
        .table("user_reports")
        .select("id, reporter_uid, target_uid, reason, details, created_at, status")
        .eq("reporter_uid", me["user_uid"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"reports": reports.data or []}


@router.get("/social/admin/reports")
def list_reports_admin(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    supabase = get_supabase_client()

    reports = (
        supabase
        .table("user_reports")
        .select("id, reporter_uid, target_uid, reason, details, created_at, status")
        .order("created_at", desc=True)
        .execute()
    )
    return {"reports": reports.data or []}


@router.post("/social/admin/users/{uid}/action")
def admin_user_action(uid: str, payload: AdminUserActionRequest, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    supabase = get_supabase_client()
    target_uid = uid.strip().upper()

    target = _fetch_user_by_uid(supabase, target_uid)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.action == "delete":
        supabase.table("users").delete().eq("user_uid", target_uid).execute()
        return {"success": True, "action": "delete"}

    next_status = "active"
    if payload.action == "suspend":
        next_status = "suspended"
    elif payload.action == "block":
        next_status = "blocked"

    update = (
        supabase
        .table("users")
        .update({"account_status": next_status, "updated_at": _now_iso()})
        .eq("user_uid", target_uid)
        .execute()
    )
    return {"success": True, "user": update.data[0] if update.data else None}


@router.post("/social/admin/schemes")
def admin_add_scheme(payload: AdminSchemeCreate, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    supabase = get_supabase_client()

    scheme_id = "custom-" + hashlib.sha1(f"{payload.title}-{_now_iso()}".encode("utf-8")).hexdigest()[:10]
    response = (
        supabase
        .table("custom_schemes")
        .insert({
            "id": scheme_id,
            "name": payload.title.strip(),
            "description": payload.description.strip(),
            "language": payload.language.strip().lower() or "en",
            "deadline": payload.deadline,
            "ministry": payload.ministry,
            "created_at": _now_iso(),
        })
        .execute()
    )
    return {"scheme": response.data[0] if response.data else None}


@router.get("/social/admin/schemes")
def admin_list_schemes(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    supabase = get_supabase_client()
    rows = supabase.table("custom_schemes").select("*").order("created_at", desc=True).execute()
    return {"schemes": rows.data or []}


@router.delete("/social/admin/schemes/{scheme_id}")
def admin_delete_scheme(scheme_id: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    supabase = get_supabase_client()
    supabase.table("custom_schemes").delete().eq("id", scheme_id.strip()).execute()
    return {"success": True}
