"""AI routes — Shopping Assistant chat, product description generator, review summary.

Uses the Anthropic SDK directly with EMERGENT_LLM_KEY or ANTHROPIC_API_KEY.
Model: claude-sonnet-4-6-20250514 (Anthropic).
All endpoints fail soft — never raise 500 on LLM failure, return fallback text.
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field

import anthropic as _anthropic

from auth_utils import get_current_user_payload

logger = logging.getLogger("abundant.ai")
router = APIRouter(prefix="/ai", tags=["ai"])


def _call_llm(system_message: str, messages: list) -> str:
    """Call Anthropic Claude API directly."""
    api_key = os.environ.get("EMERGENT_LLM_KEY") or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("No LLM API key configured (set EMERGENT_LLM_KEY or ANTHROPIC_API_KEY)")
    client = _anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-6-20250514",
        max_tokens=1024,
        system=system_message,
        messages=messages,
    )
    return response.content[0].text


# ----------------------------- Schemas -----------------------------
class ChatTurn(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    products: List[dict] = Field(default_factory=list)


class DescribeRequest(BaseModel):
    title: str
    category: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    specs: Optional[dict] = None


class DescribeResponse(BaseModel):
    description: str


class ReviewSummaryResponse(BaseModel):
    summary: Optional[str] = None


# ----------------------------- Helpers -----------------------------
def _extract_keywords(text: str) -> List[str]:
    # Strip common stopwords, keep nouns-ish keywords
    stop = {
        "a", "an", "the", "and", "or", "but", "for", "to", "of", "in", "on", "at", "with",
        "i", "im", "me", "my", "we", "us", "you", "your", "is", "are", "was", "were", "be",
        "do", "does", "did", "have", "has", "had", "can", "could", "would", "should", "will",
        "looking", "find", "show", "want", "need", "need", "buy", "get", "good", "best",
        "what", "where", "when", "why", "how", "which", "this", "that", "those", "these",
        "some", "any", "all", "more", "less", "than", "from", "about", "as",
    }
    tokens = re.findall(r"[a-zA-Z0-9]{2,}", text.lower())
    return [t for t in tokens if t not in stop][:8]


async def _search_products(db, keywords: List[str], limit: int = 3) -> List[dict]:
    if not keywords:
        return []
    regex = "|".join(re.escape(k) for k in keywords)
    cursor = db.products.find(
        {
            "$or": [
                {"title": {"$regex": regex, "$options": "i"}},
                {"description": {"$regex": regex, "$options": "i"}},
                {"tags": {"$regex": regex, "$options": "i"}},
                {"category": {"$regex": regex, "$options": "i"}},
                {"brand": {"$regex": regex, "$options": "i"}},
            ]
        },
        {"_id": 0, "id": 1, "title": 1, "price": 1, "sale_price": 1, "images": 1,
         "rating": 1, "review_count": 1, "category": 1, "brand": 1},
    ).sort([("rating", -1), ("review_count", -1)]).limit(limit)
    return [doc async for doc in cursor]


def _format_product_for_prompt(p: dict) -> str:
    price = p.get("sale_price") or p.get("price") or 0
    return f"- [PRODUCT:{p['id']}] {p['title']} — ${price:.2f}"


# ----------------------------- Endpoints -----------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    db = request.app.state.db
    keywords = _extract_keywords(req.message)
    products = await _search_products(db, keywords, limit=3)

    product_block = "\n".join(_format_product_for_prompt(p) for p in products) if products else "(no relevant products found in the catalog)"
    system = (
        "You are a friendly, concise shopping assistant for Abundant Merchandise, an online store. "
        "Help customers find products and answer questions about orders, shipping, returns. "
        "When you recommend products, ONLY use the products listed in the CATALOG_CONTEXT below. "
        "Format each recommendation on its own line beginning with [PRODUCT:id] (the frontend will render product cards). "
        "Keep replies under 120 words. Be warm and helpful, not salesy.\n\n"
        f"CATALOG_CONTEXT (top matches for this query):\n{product_block}\n"
    )

    try:
        messages = [
            {"role": turn.role, "content": turn.content}
            for turn in req.history[-6:]  # cap at last 6 turns
        ]
        messages.append({"role": "user", "content": req.message})
        reply_text = _call_llm(system, messages)
    except Exception as e:  # noqa: BLE001
        logger.warning("AI chat failed: %s", e)
        if products:
            reply_text = "Here are a few products you might like:\n" + "\n".join(_format_product_for_prompt(p) for p in products)
        else:
            reply_text = "I'm having trouble reaching my AI right now. Try browsing our Shop page or contact support."

    return ChatResponse(reply=reply_text, products=products)


@router.post("/generate-description", response_model=DescribeResponse)
async def generate_description(req: DescribeRequest, request: Request):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="title is required")

    specs_str = ", ".join(f"{k}: {v}" for k, v in (req.specs or {}).items()) or "n/a"
    prompt = (
        f"Write a compelling, SEO-friendly product description for an e-commerce store.\n"
        f"Product: {req.title}\n"
        f"Brand: {req.brand or 'unbranded'}\n"
        f"Category: {req.category or 'general'}\n"
        f"Price: ${(req.price or 0):.2f}\n"
        f"Specs: {specs_str}\n\n"
        f"Write 2-3 sentences that highlight key benefits and appeal to buyers. "
        f"Be specific and persuasive. No fluff, no marketing clichés. Return only the description text."
    )

    system = "You write tight, persuasive product copy for e-commerce. No fluff."
    try:
        text = _call_llm(system, [{"role": "user", "content": prompt}])
        text = (text or "").strip().strip('"')
        if not text:
            raise RuntimeError("empty reply")
    except Exception as e:  # noqa: BLE001
        logger.warning("AI description gen failed: %s", e)
        # Fallback: simple template
        text = (
            f"Meet the {req.title}{(' by ' + req.brand) if req.brand else ''} — a standout in "
            f"{req.category or 'our catalog'} offering reliable quality and strong everyday value at "
            f"${(req.price or 0):.2f}. Designed with attention to detail and built to last."
        )

    return DescribeResponse(description=text)


@router.get("/review-summary/{product_id}", response_model=ReviewSummaryResponse)
async def review_summary(product_id: str, request: Request):
    db = request.app.state.db
    product = await db.products.find_one({"id": product_id}, {"_id": 0, "id": 1, "ai_review_summary": 1, "ai_review_summary_count": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Count reviews
    review_count = await db.reviews.count_documents({"product_id": product_id})
    if review_count < 10:
        return ReviewSummaryResponse(summary=None)

    # Use cache if review count hasn't changed
    cached_summary = product.get("ai_review_summary")
    cached_count = product.get("ai_review_summary_count", 0)
    if cached_summary and cached_count == review_count:
        return ReviewSummaryResponse(summary=cached_summary)

    # Generate fresh summary
    cursor = db.reviews.find(
        {"product_id": product_id},
        {"_id": 0, "title": 1, "body": 1, "rating": 1},
    ).sort([("created_at", -1)]).limit(50)
    reviews = [r async for r in cursor]
    if not reviews:
        return ReviewSummaryResponse(summary=None)

    joined = "\n".join(
        f"({r.get('rating', 0)}★) {r.get('title', '')}: {r.get('body', '')}" for r in reviews
    )[:6000]

    prompt = (
        "Summarize these customer reviews in exactly 2 sentences. "
        "Focus on what customers consistently praise and any common criticisms. "
        "Do not start with 'Customers say' — be direct.\n\n"
        f"Reviews:\n{joined}"
    )
    system = "You write neutral, balanced summaries of customer reviews. Exactly 2 sentences."
    try:
        text = _call_llm(system, [{"role": "user", "content": prompt}])
        text = (text or "").strip().strip('"')
        if not text:
            return ReviewSummaryResponse(summary=None)
    except Exception as e:  # noqa: BLE001
        logger.warning("AI review summary failed: %s", e)
        return ReviewSummaryResponse(summary=None)

    # Cache result
    await db.products.update_one(
        {"id": product_id},
        {"$set": {
            "ai_review_summary": text,
            "ai_review_summary_count": review_count,
            "ai_review_summary_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return ReviewSummaryResponse(summary=text)


# ==================== Saved Conversations (auth) ====================
class ConversationTurn(BaseModel):
    role: str
    content: str


class ConversationSaveRequest(BaseModel):
    title: Optional[str] = None
    messages: List[ConversationTurn]


class ConversationSummary(BaseModel):
    id: str
    title: str
    message_count: int
    created_at: str
    updated_at: str
    pinned: bool = False


class ConversationDetail(ConversationSummary):
    messages: List[ConversationTurn]


class ConversationPatch(BaseModel):
    pinned: Optional[bool] = None
    title: Optional[str] = None


def _derive_title(messages: List[ConversationTurn]) -> str:
    # Use the first user message; truncate to ~50 chars.
    for m in messages:
        if m.role == "user" and m.content.strip():
            t = m.content.strip().replace("\n", " ")
            return (t[:60] + "…") if len(t) > 60 else t
    return "Untitled chat"


@router.get("/conversations", response_model=List[ConversationSummary])
async def list_conversations(request: Request, user: dict = Depends(get_current_user_payload)):
    db = request.app.state.db
    uid = user["sub"]
    cursor = db.ai_conversations.find(
        {"user_id": uid},
        {"_id": 0, "id": 1, "title": 1, "messages": 1, "created_at": 1, "updated_at": 1, "pinned": 1},
    ).sort([("pinned", -1), ("updated_at", -1)]).limit(50)
    out: List[ConversationSummary] = []
    async for doc in cursor:
        out.append(ConversationSummary(
            id=doc["id"],
            title=doc.get("title") or "Untitled chat",
            message_count=len(doc.get("messages", [])),
            created_at=doc.get("created_at", ""),
            updated_at=doc.get("updated_at", ""),
            pinned=bool(doc.get("pinned", False)),
        ))
    return out


@router.post("/conversations", response_model=ConversationDetail)
async def save_conversation(payload: ConversationSaveRequest, request: Request, user: dict = Depends(get_current_user_payload)):
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages required")
    db = request.app.state.db
    now = datetime.now(timezone.utc).isoformat()
    cid = uuid.uuid4().hex
    title = (payload.title or "").strip() or _derive_title(payload.messages)
    msgs = [m.model_dump() for m in payload.messages][-50:]  # cap stored size
    doc = {
        "id": cid,
        "user_id": user["sub"],
        "title": title,
        "messages": msgs,
        "pinned": False,
        "created_at": now,
        "updated_at": now,
    }
    await db.ai_conversations.insert_one(doc)
    return ConversationDetail(
        id=cid,
        title=title,
        message_count=len(msgs),
        created_at=now,
        updated_at=now,
        messages=payload.messages,
    )


@router.get("/conversations/{cid}", response_model=ConversationDetail)
async def get_conversation(cid: str, request: Request, user: dict = Depends(get_current_user_payload)):
    db = request.app.state.db
    doc = await db.ai_conversations.find_one(
        {"id": cid, "user_id": user["sub"]},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationDetail(
        id=doc["id"],
        title=doc.get("title") or "Untitled chat",
        message_count=len(doc.get("messages", [])),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
        pinned=bool(doc.get("pinned", False)),
        messages=[ConversationTurn(**m) for m in doc.get("messages", [])],
    )


@router.patch("/conversations/{cid}", response_model=ConversationSummary)
async def patch_conversation(cid: str, patch: ConversationPatch, request: Request, user: dict = Depends(get_current_user_payload)):
    db = request.app.state.db
    updates: dict = {}
    if patch.pinned is not None:
        updates["pinned"] = bool(patch.pinned)
    if patch.title is not None:
        title = patch.title.strip()
        if title:
            updates["title"] = title[:120]
    if not updates:
        raise HTTPException(status_code=400, detail="No supported fields provided")
    res = await db.ai_conversations.find_one_and_update(
        {"id": cid, "user_id": user["sub"]},
        {"$set": updates},
        projection={"_id": 0, "id": 1, "title": 1, "messages": 1, "created_at": 1, "updated_at": 1, "pinned": 1},
        return_document=True,
    )
    # Motor's find_one_and_update returns None if not found
    if not res:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationSummary(
        id=res["id"],
        title=res.get("title") or "Untitled chat",
        message_count=len(res.get("messages", [])),
        created_at=res.get("created_at", ""),
        updated_at=res.get("updated_at", ""),
        pinned=bool(res.get("pinned", False)),
    )


@router.delete("/conversations/{cid}")
async def delete_conversation(cid: str, request: Request, user: dict = Depends(get_current_user_payload)):
    db = request.app.state.db
    res = await db.ai_conversations.delete_one({"id": cid, "user_id": user["sub"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": True}


class ShareResponse(BaseModel):
    token: str
    url: str


def _public_app_url() -> str:
    base = os.environ.get("APP_URL", "").rstrip("/")
    return base or ""


@router.post("/conversations/{cid}/share", response_model=ShareResponse)
async def share_conversation(cid: str, request: Request, user: dict = Depends(get_current_user_payload)):
    db = request.app.state.db
    doc = await db.ai_conversations.find_one(
        {"id": cid, "user_id": user["sub"]},
        {"_id": 0, "id": 1, "share_token": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    token = doc.get("share_token") or uuid.uuid4().hex
    if not doc.get("share_token"):
        await db.ai_conversations.update_one(
            {"id": cid, "user_id": user["sub"]},
            {"$set": {"share_token": token, "shared_at": datetime.now(timezone.utc).isoformat()}},
        )
    base = _public_app_url()
    url = f"{base}/share/chat/{token}" if base else f"/share/chat/{token}"
    return ShareResponse(token=token, url=url)


@router.get("/share/{token}", response_model=ConversationDetail)
async def read_shared_conversation(token: str, request: Request):
    """Public, read-only view of a shared conversation. No auth required."""
    db = request.app.state.db
    doc = await db.ai_conversations.find_one(
        {"share_token": token},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Shared chat not found")
    return ConversationDetail(
        id=doc["id"],
        title=doc.get("title") or "Untitled chat",
        message_count=len(doc.get("messages", [])),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
        messages=[ConversationTurn(**m) for m in doc.get("messages", [])],
    )
