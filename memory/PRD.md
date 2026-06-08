# ABNDT — Abundant Merchandise — PRD

## Original problem statement
Continue building the Abundant Merchandise e-commerce app from an emergent-prompt that defines:
- Phase 1: 5 production bug fixes (cart promo, out-of-stock UX, seed review_count, blog detail, wishlist images)
- Phase 2: 6 design polish items (reveal-on-scroll, cookie banner positioning, sticky PDP ATC, flash sale copy, filter badge, footer payment badges)
- Phase 3: 3 AI features powered by Claude (shopping assistant chat, admin description generator, review summarizer)
- Phase 4: 3 mobile UX upgrades (swipe-close cart, PDP image zoom, larger variant tap targets)

## Tech stack
- React 19 + react-router v6, Tailwind, shadcn/ui, lucide-react
- FastAPI + Motor (MongoDB) + Pydantic
- Auth: JWT (custom) with bcrypt
- AI: Anthropic Claude (claude-sonnet-4-6) via emergentintegrations + Emergent Universal LLM key
- Email/Payments: Resend/Stripe scaffolding present but not in scope this iteration

## Architecture
- Frontend served by CRA dev server on :3000 (supervisor-managed)
- Backend FastAPI on :8001 behind /api ingress prefix
- All product, order, cart, promo, review and AI endpoints under /api/*
- MongoDB seeded with 91 products via `python backend/seed_db.py`

## Key user personas
- Anonymous shopper — browses, searches, uses cart, talks to AI assistant, applies promos
- Registered customer — wishlist, orders, reviews
- Admin (`admin@abndt.com / Admin@12345`) — full product, order and content management with AI-assisted product description

## What's been implemented (Jan 2026)
### PWA — Add to Home Screen (Feb 2026)
- Added `public/manifest.json` with name "Abundant Merchandise", brand `theme_color` #E8621A, `display: standalone`, `start_url: /?source=pwa`, and three shortcuts: **Ask AI** (`/?ai=1`), **My Saved Chats** (`/account/chats`), **Shop** (`/shop`).
- Added `icon-512.svg` (maskable brand star mark) and a 180x180 `apple-touch-icon.png` generated via Pillow.
- Wired `<link rel="manifest">`, `<link rel="apple-touch-icon">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `mobile-web-app-capable` meta tags in `public/index.html`.
- `ShoppingAssistant` listens for `?ai=1` query param on mount and auto-opens, then cleans the URL — so the "Ask AI" home-screen shortcut feels native.

### Saved AI Chats — Pin / Search + Shared Chat QR (Feb 2026)
- Backend `PATCH /api/ai/conversations/{id}` (auth) supports `{pinned?: bool, title?: str}`; list endpoint sorts pinned-first then by `updated_at` desc. Tests in `/app/backend/tests/test_conversations_pin.py` (7/7 PASS).
- `/account/chats` now has a live **search box** (data-testid `saved-chats-search`) that filters by title, and a per-row **Pin / Unpin** toggle (data-testid `saved-chat-pin`) with a "Pinned" badge — pinned chats stick to the top across reloads.
- Shared chat page `/share/chat/:token` gets a **Scan QR** toggle (data-testid `shared-chat-qr-toggle`) that reveals a QR code (via api.qrserver.com) encoding the current public URL — perfect for in-person gifting. Graceful fallback icon if the QR service is unreachable.

### Saved AI Conversations — Continue / Share / Email (Feb 2026)
- "Continue this chat" button on `/account/chats` detail panel dispatches `am:ai-continue-chat` window event; `ShoppingAssistant` listens, rehydrates messages, and auto-opens the floating panel (user is sent to `/` to keep context).
- "Email" button opens the user's mail client via `mailto:` pre-filled with a clean transcript (product tags stripped, title in subject) — works for self-email or gifting without backend setup.
- "Share" button POSTs to `POST /api/ai/conversations/{id}/share` (auth) to mint a one-time `share_token`, then builds the shareable URL from `window.location.origin` (defensive against backend APP_URL mismatch), copies it via Clipboard API with a `document.execCommand('copy')` textarea fallback for restrictive browsers, and a final `window.prompt` fallback. `GET /api/ai/share/{token}` is PUBLIC.
- New public route `/share/chat/:token` (`SharedChat.jsx`) renders the conversation read-only with branded header + CTA back to the store. 404 token shows a friendly error state.
- Hydration warning fix: row item is now `<div role="button" tabIndex={0}>` with Enter/Space keyboard support (was nested `<button>` inside `<button>` — invalid HTML).
- Tests: `/app/backend/tests/test_saved_chats_share.py` (11/11 PASS). Iteration_2 frontend Playwright run verified end-to-end Continue → rehydrate → follow-up reply, anonymous share viewer, and 404 error state.

### Bonus enhancement: Saved AI Conversations (Jan 2026)
- New backend collection `ai_conversations` with auth-protected CRUD:
  - `GET /api/ai/conversations` list (50 most recent, sorted)
  - `POST /api/ai/conversations` save chat (auto-derives title from first user message, caps stored size at 50 messages)
  - `GET /api/ai/conversations/{id}` detail
  - `DELETE /api/ai/conversations/{id}` remove
  - `POST /api/ai/conversations/{id}/share` mints a one-time share_token, returns public URL
  - `GET /api/ai/share/{token}` PUBLIC read-only view of a shared conversation (no auth)
- ShoppingAssistant gets a header "Save" button (visible to logged-in users, requires at least one user message; tooltip nudges guests to sign in).
- `ShoppingAssistant` also listens for the `am:ai-continue-chat` window event and rehydrates its messages + opens.
- `/account/chats` master/detail page now exposes a 3-button toolbar on each saved conversation:
  - **Continue this chat** → dispatches `am:ai-continue-chat` and navigates home so the floating widget overlays in context
  - **Email** → opens the user's email client with a clean plain-text transcript pre-filled
  - **Share** → POSTs to backend, copies `${origin}/share/chat/{token}` to clipboard, fallback prompt for restricted browsers
- Public `/share/chat/:token` route renders the conversation read-only with branded header + CTA back to the store.

### Bugs
- [x] CartDrawer promo now hits `/api/promo/validate` (was hard-coded "coming soon")
- [x] ProductCard + QuickViewModal show **Out of stock** overlay + disabled Add-to-cart button when `stock_quantity <= 0`
- [x] Seeded `reviews_count` keys renamed to `review_count` in seed_data, extra_seed, extra_seed_2, seed_db — products now display real review counts
- [x] Blog post detail pages (`/blog/:slug`) with 6 real articles instead of dead-end card clicks
- [x] WishlistContext already stores `images` array (matches QuickViewModal expectation)

### Design polish
- [x] `useRevealOnScroll` hook + `.reveal` CSS — ProductCard fades+rises into view as it scrolls in
- [x] CookieBanner: positioned above MobileBottomNav on small screens, X dismiss button for session-only opt-out, Accept persists in localStorage
- [x] Sticky mobile ATC bar on PDP appears once main buy box scrolls out of view (`StickyAddToCart`)
- [x] FlashSale section now has subtitle "Hand-picked deals refreshed daily — gone at midnight"
- [x] Mobile Filters button shows active filter count badge (`shop-filter-toggle-count`)
- [x] Footer renders inline-SVG payment badges (Visa, Mastercard, PayPal, Apple Pay, AMEX) with hover-color reveal

### AI features (Claude Sonnet 4.6 via Emergent LLM key)
- [x] `POST /api/ai/chat` — shopping assistant with catalog-grounded recommendations (returns reply + product objects). Frontend `ShoppingAssistant` floating widget with history persistence, mini product cards, reset, close.
- [x] `POST /api/ai/generate-description` — admin gets ✨ **Generate with AI** button in product form to fill descriptions from title/brand/category/specs.
- [x] `GET /api/ai/review-summary/{product_id}` — 2-sentence neutral summary of reviews (only when ≥10 reviews, result cached on product doc, re-generated when review count changes).

### Mobile UX
- [x] CartDrawer swipe-down-to-close (touchstart/move/end on header, threshold 80px)
- [x] PDP image opens full-screen `ImageLightbox` (swipe + arrow keys + ESC + chevrons)
- [x] PDP variant chips bumped to min 44x44 px tap targets

## Testing
- Backend tests 17/17 passing (per `/app/test_reports/iteration_1.json`)
- Frontend ~85% passing in automated run; the remaining 15% was a test-script selector ambiguity (Navbar search and Login share `button[type=submit]`), not an app bug. Manually verified Admin AI description button works end-to-end.

## Backlog / next priorities
- P1: Replace in-memory `PROMO_CODES` with DB-backed promo collection (commerce_routes.py)
- P1: Split `commerce_routes.py` (≈1900 LOC) into orders / promo / admin / cart modules
- P2: Wire Stripe + Resend production keys when user provides them
- P2: Add CartDrawer stagger animation for items
- P3: Server-Sent-Events streaming for shopping-assistant chat
- P3: Multilingual product descriptions (admin AI button)

## Files of interest
- `/app/backend/ai_routes.py` (new) — Claude endpoints
- `/app/backend/server.py` — mounts ai_router under /api
- `/app/frontend/src/components/ai/ShoppingAssistant.jsx` (new)
- `/app/frontend/src/pages/BlogPost.jsx` (new)
- `/app/frontend/src/components/product/{ImageLightbox,StickyAddToCart}.jsx` (new)
- `/app/frontend/src/components/layout/PaymentBadges.jsx` (new)
- `/app/frontend/src/hooks/useRevealOnScroll.js` (new)
- Modified: ProductCard, QuickViewModal, CartDrawer, CookieBanner, Filters/Shop, Footer, FlashSale, ReviewSection, AdminDashboard, ProductDetail, Layout, App.js, App.css, seed_data, seed_db, extra_seed
