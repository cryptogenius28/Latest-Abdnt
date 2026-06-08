# Abundant Merchandise — PRD

## Original problem statement
Continuation build of an existing React 19 + FastAPI + MongoDB e-commerce site (https://dropship-route.preview.emergentagent.com). The continuation prompt adds Phases 5 through 8: fulfillment architecture, homepage/category redesign, shop/filter upgrades, PDP upgrades. Design tokens and tech stack are locked.

## Tech stack
- Frontend: React 19, CRA + craco, Tailwind CSS, shadcn/ui + Radix primitives, lucide-react, react-router v6
- Backend: FastAPI, Motor (async MongoDB), Pydantic v2
- Auth: JWT (HttpOnly cookies + Bearer token), bcrypt
- Payments: Stripe (sk_test live; pk_test in frontend env)
- AI: Anthropic claude-sonnet-4-20250514 via Emergent Universal LLM key
- Supervisor manages frontend (3000) and backend (8001); all backend routes under /api

## User personas
- Customer (default `role: customer`): browses storefront, places orders. Demo: user@demo.com / User@123.
- Admin (`role: admin`): manages catalog, inventory, orders, content. Demo: admin@abundant.com / Admin@2026 (seeded from ADMIN_EMAIL / ADMIN_PASSWORD).

## Architecture decisions
- `fulfillment_type` (warehouse | dropship | digital) drives both the catalog and order routing.
- Warehouse products own stock + reorder_point; dropship stock is 0 (supplier-managed); digital has optional download_url.
- Orders capture `has_warehouse` / `has_dropship` flags at checkout for downstream routing.
- The PriceRange dual-thumb slider uses Radix Slider primitives directly (shadcn's wrapper only renders one thumb).
- Hero animation is CSS-only (`@keyframes fadeSlideUp` + `animation-delay` per word). No JS timers, respects `prefers-reduced-motion`.
- Horizontal-scroll rails use the new `.scrollbar-hide` utility (CSS), `snap-x snap-mandatory`, `flex-shrink-0`.

## Implemented — Phase 5 (2026-06-08)
- 5A migrate_fulfillment.py — backfill + 50/50 random split + reorder_point seed.
- 5B AdminDashboard product form — conditional fulfillment section (stock+reorder / dropship info / download_url).
- 5C GET /api/admin/inventory/low-stock + LowStockCard on admin Overview.
- 5D Order.has_warehouse / has_dropship — set at checkout, backfilled on legacy reads, surfaced in admin order list + modal.

## Implemented — Phase 6 (2026-06-08)
- 6A Hero — full-bleed split layout, animated word stagger (80ms), mosaic with scale-in, animated scroll chevron.
- 6B Categories — horizontal snap-scroll on mobile, 4-col grid on desktop, brand-coloured hover bottom bar via `.category-tile::after`.
- 6C FulfillmentHighlights — new 3-card section (Warehouse/Dropship/Digital) inserted between Trust Bar and Flash Sale.
- 6D ProductCard — `.product-image-wrap::after` brand progress bar that fills on group hover.
- 6E WarehousePicks — new homepage section that fetches `fulfillment_type=warehouse&sort=rating&page_size=8`.

## Implemented — Phase 7 (2026-06-08)
- 7A Fulfillment filter pills already wired through Filters.jsx + AppliedPills (Phase 5 work).
- 7B Filters.jsx — Radix dual-thumb price range slider with 400ms debounce + Reset button.
- 7C Shop.jsx — desktop sort renders as pill row; mobile keeps the existing `<select>`.
- 7D Shop.jsx — SVG empty-state illustration (sad magnifying glass) for both search and filter empties; "Clear all filters" button.

## Implemented — Phase 8 (2026-06-08)
- 8A ProductDetail.jsx breadcrumb — Home > Category > truncated(40) title with proper test IDs.
- 8B Tabs converted to shadcn `Tabs`; added 4th tab (Reviews) embedding ReviewSection; "Shipping & Returns" content updated with warehouse / dropship / digital language.
- 8C Prominent fulfillment banner near price/ATC with `data-fulfillment` attribute and contextual headline (in stock count for warehouse).
- 8D Related products horizontal-scroll rail (8 items minus the current product, ProductCard at w-64, snap-start).

## Files touched
**Backend**
- backend/models.py, backend/commerce_models.py, backend/commerce_routes.py, backend/server.py, backend/migrate_fulfillment.py (NEW), backend/.env (admin/JWT/Stripe secret)

**Frontend**
- src/pages/Home.jsx, src/pages/Shop.jsx, src/pages/ProductDetail.jsx, src/pages/AdminDashboard.jsx
- src/components/product/Filters.jsx
- src/components/home/FulfillmentHighlights.jsx (NEW), src/components/home/WarehousePicks.jsx (NEW)
- src/App.css (keyframes, progress bar, scrollbar-hide, category-tile underline)
- src/constants/testIds.js (new IDs across SHOP, FILTER, PDP, ADMIN)
- frontend/.env (REACT_APP_STRIPE_PUBLISHABLE_KEY)

## Testing status (2026-06-08)
- Phase 5 backend: iteration_4.json — 12/12 pass.
- Phase 6/7/8 frontend: iteration_5.json — 44/44 assertions pass.
- Live Stripe checkout exercised manually with mixed warehouse + dropship cart → order recorded `has_warehouse=true has_dropship=true`.

## Prioritised backlog
- P1 — Real-time low-stock toast / email when a product crosses reorder_point.
- P2 — Idempotent `--seed` flag on migrate_fulfillment.py.
- P2 — Promote `home-fulfillment-cta-*` clicks to analytics events (track which fulfillment lane converts best).
- P2 — Replace WarehousePicks's local QuickViewModal with the global one from Home (small DOM cleanup).
- P3 — Surface fulfillment badge in the admin products list column.
- P3 — Add daily admin email digest with a "Low Stock" section.

## Credentials
See `/app/memory/test_credentials.md`.
