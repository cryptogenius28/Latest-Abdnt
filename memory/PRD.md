# Abundant Merchandise — PRD

## Original problem statement
Continuation build of an existing React 19 + FastAPI + MongoDB e-commerce site (https://dropship-route.preview.emergentagent.com). The continuation prompts added Phases 5 through 8 plus a deployment-readiness polish iteration (digital catalog + restock alerts). Design tokens and tech stack are locked.

## Tech stack
- Frontend: React 19, CRA + craco, Tailwind CSS, shadcn/ui + Radix primitives, lucide-react, react-router v6, sonner
- Backend: FastAPI, Motor (async MongoDB), Pydantic v2, APScheduler (daily admin digest)
- Auth: JWT (HttpOnly cookies + Bearer token), bcrypt
- Payments: Stripe (sk_test live in backend; pk_test stored in frontend env)
- AI: Anthropic claude-sonnet-4-20250514 via Emergent Universal LLM key
- Supervisor manages frontend (3000) and backend (8001); all backend routes under `/api`

## User personas
- Customer (`role: customer`): browses storefront, places orders, subscribes to restock alerts. Demo: user@demo.com / User@123.
- Admin (`role: admin`): manages catalog, inventory, orders, content, sees restock waitlist. Demo: admin@abundant.com / Admin@2026.

## Architecture decisions
- `fulfillment_type` (warehouse | dropship | digital) drives the catalog and order routing. **Only warehouse products gate purchase on `stock_quantity`** — dropship is supplier-managed; digital is instant.
- Orders capture `has_warehouse` / `has_dropship` flags at checkout for downstream routing.
- The PriceRange dual-thumb slider uses Radix Slider primitives directly (shadcn's wrapper only exposes one thumb).
- Hero animation is CSS-only (`@keyframes fadeSlideUp` + `animation-delay` per word). Respects `prefers-reduced-motion`.
- Horizontal-scroll rails use `.scrollbar-hide` + `snap-x snap-mandatory`.
- Restock alerts use a `restock_alerts` collection with a unique compound index `(product_id, email)` for idempotency.

## Implemented — Phase 5 (2026-06-08)
- 5A `migrate_fulfillment.py` — backfill + 50/50 random warehouse/dropship split + reorder_point seed.
- 5B Admin product form — conditional fulfillment section (stock+reorder / dropship info / download_url).
- 5C `GET /api/admin/inventory/low-stock` + `LowStockCard` on admin Overview.
- 5D `Order.has_warehouse` / `has_dropship` — set at checkout, backfilled on legacy reads, surfaced in admin order list + modal.

## Implemented — Phase 6 (2026-06-08)
- 6A Hero — split layout, animated word stagger, mosaic with scale-in, animated scroll chevron.
- 6B Categories — horizontal snap-scroll on mobile, 4-col grid on desktop, brand-coloured hover underline.
- 6C `FulfillmentHighlights` — 3-card "Shop by Fulfillment" section.
- 6D ProductCard — brand progress bar reveal on group hover.
- 6E `WarehousePicks` — top-rated warehouse rail.

## Implemented — Phase 7 (2026-06-08)
- 7A Fulfillment filter pills wired through Filters.jsx + AppliedPills.
- 7B Radix dual-thumb price range slider with 400ms debounce + Reset.
- 7C Desktop sort pill row (select kept on mobile).
- 7D SVG empty-state illustration for search + filter empties; "Clear all filters" CTA.

## Implemented — Phase 8 (2026-06-08)
- 8A PDP breadcrumb (Home > Category > truncated 40-char title).
- 8B Shadcn Tabs (Description / Specs / Reviews / Shipping) — Reviews embeds ReviewSection.
- 8C Prominent fulfillment banner with `data-fulfillment` attribute; per-lane copy + colour.
- 8D Horizontal-scroll "You might also like" rail (7 items, current excluded).

## Implemented — Pre-deployment polish (2026-06-08)
- **Stock-gating fix** — non-warehouse PDPs/cards are always purchasable; `LowStockBadge` is hidden for them.
- **Curated digital catalog** — `seed_digital_products.py` inserts 5 high-design digital products (Lightroom presets, Deep Work eBook, Monarch font duo, Lo-Fi sample pack, Founder OS Notion template). Adjustable Dumbbells restored to warehouse.
- **Restock alert subscription** — `POST /api/restock-alerts` (public), `GET /api/admin/restock-alerts` (admin). `RestockAlertForm` on out-of-stock warehouse PDPs with success state and toast. `RestockAlertsCard` on admin Overview alongside Low Stock card.

## Files touched (cumulative)
**Backend**
- backend/models.py, commerce_models.py, commerce_routes.py, server.py, auth_utils.py
- backend/migrate_fulfillment.py (NEW), backend/seed_digital_products.py (NEW)
- backend/.env (admin/JWT/Stripe secret)

**Frontend**
- src/pages/Home.jsx, Shop.jsx, ProductDetail.jsx, AdminDashboard.jsx
- src/components/product/Filters.jsx, ProductCard.jsx
- src/components/product/RestockAlertForm.jsx (NEW)
- src/components/home/FulfillmentHighlights.jsx (NEW), WarehousePicks.jsx (NEW)
- src/App.css, src/constants/testIds.js
- frontend/.env (REACT_APP_STRIPE_PUBLISHABLE_KEY)

## Testing status (2026-06-08)
- iteration_4.json — Phase 5 backend: **12/12 pass**.
- iteration_5.json — Phase 6/7/8 frontend: **44/44 pass**.
- iteration_6.json — Pre-deployment regression: backend **15/15 pass**, frontend smoke (restock alerts, digital catalog, dropship fix, home/shop) verified.
- Live Stripe checkout exercised end-to-end with mixed warehouse + dropship cart → order records `has_warehouse=true has_dropship=true`.
- **Deployment agent: PASS** — no blockers.

## Prioritised backlog
- P1 — Cron job that emails subscribers when a product's stock returns above its reorder_point (collection schema already supports `notified_at`).
- P2 — Idempotent `--seed` flag on `migrate_fulfillment.py`.
- P2 — Promote `home-fulfillment-cta-*` clicks to analytics events.
- P3 — Surface fulfillment badge in the admin products list column.
- P3 — Add a "Restock alerts" weekly summary section to the existing daily admin email digest.

## Credentials
See `/app/memory/test_credentials.md`.
