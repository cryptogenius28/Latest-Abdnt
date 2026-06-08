# Abundant Merchandise — PRD

## Original problem statement
Continuation build (Phase 5 of an ongoing engagement). Existing React 19 + FastAPI + MongoDB e-commerce site at https://dropship-route.preview.emergentagent.com. Add Fulfillment Architecture across backend + admin without changing tech stack or design tokens.

## Tech stack
- Frontend: React 19, CRA + craco, Tailwind CSS, shadcn/ui, lucide-react, react-router v6
- Backend: FastAPI, Motor (async MongoDB), Pydantic v2
- Auth: JWT (HttpOnly cookies + Bearer token), bcrypt
- AI: Anthropic claude-sonnet-4-20250514 via Emergent Universal LLM key
- Supervisor manages frontend (3000) and backend (8001); all backend routes under /api

## Architecture decisions for Phase 5
- `fulfillment_type` is the source-of-truth field on every product: `warehouse | dropship | digital`.
- Warehouse products own stock (`stock_quantity`) and a `reorder_point` (default 10) used for low-stock alerts.
- Dropship products carry `stock_quantity=0`; supplier manages real stock.
- Digital products carry an optional `download_url`.
- Orders capture which fulfillment paths are present via boolean flags `has_warehouse` / `has_dropship` set at checkout.

## User personas
- Customer (default `role: customer`): browses storefront, places orders. Demo account: user@demo.com / User@123.
- Admin (`role: admin`): manages catalog, inventory, orders, content. Seeded from ADMIN_EMAIL / ADMIN_PASSWORD env vars. Demo account: admin@abundant.com / Admin@2026.

## Core requirements (Phase 5 — implemented 2026-06-08)
- **5A — Migration script** `backend/migrate_fulfillment.py`
  - Backfills null/missing `fulfillment_type` → `"warehouse"`.
  - Randomises catalog into ~50/50 warehouse/dropship split (per user choice for this iteration).
  - Seeds `reorder_point=10` on any product missing the field.
  - Zeroes dropship stock; gives warehouse-zero products a 3–80 starting quantity.
- **5B — Admin product form fulfillment section**
  - Fulfillment-type selector with three options.
  - `warehouse` → stock_quantity + reorder_point inputs.
  - `dropship` → read-only amber info box "Stock managed by supplier".
  - `digital` → optional download_url input.
  - Pydantic `ProductBase` gains `reorder_point: int = 10` and `download_url: Optional[str] = ""`. `ProductUpdate` accepts both.
- **5C — Low-stock admin panel**
  - Endpoint: `GET /api/admin/inventory/low-stock` returns `{ count, items[], threshold_default }` of warehouse products where `stock_quantity <= reorder_point`, sorted worst-first.
  - Frontend: `LowStockCard` rendered on Admin Overview. Compact table (product, SKU truncated, qty, reorder pt, Edit). Count badge in header. Empty state shows green "All stocked ✓".
  - Edit link navigates to /admin/products with `state.editProductId` to auto-open the editor for that product.
- **5D — Order routing flags**
  - `Order` model gains `has_warehouse: bool` and `has_dropship: bool` (default False).
  - `commerce_routes.create_checkout_session` computes both from line items.
  - `admin_list_orders` backfills these flags on legacy docs that pre-date Phase 5.
  - Admin order modal lists each line item with a coloured Fulfillment badge (warehouse=blue, dropship=orange, digital=violet); the orders list table shows aggregate badges in a new "Fulfillment" column.

## Files touched
- backend/models.py — ProductBase + ProductUpdate
- backend/commerce_models.py — Order
- backend/commerce_routes.py — create_checkout_session, admin_list_orders
- backend/server.py — /api/admin/inventory/low-stock
- backend/migrate_fulfillment.py — NEW
- frontend/src/pages/AdminDashboard.jsx — Fulfillment section, LowStockCard, OrderStatusModal line items, AdminOrders fulfillment column, FulfillmentBadge helper
- frontend/src/constants/testIds.js — new ADMIN testids
- backend/.env — added ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET (were missing)
- memory/test_credentials.md — admin + customer credentials

## Testing status (2026-06-08)
- Backend testing agent: 12/12 passing, 1 skipped (live Stripe checkout — STRIPE_API_KEY not configured in this pod; synthetic order insertion validated 5D flags).
- Frontend: visual sanity verified via Playwright screenshot script (low-stock card with 2 items renders; all three fulfillment-type variants of the form render correctly).

## Prioritised backlog (Phase 6+ — awaiting spec)
- P0 — Phase 6/7/8 specs from user (not yet provided).
- P1 — STRIPE_API_KEY for end-to-end checkout testing.
- P1 — Idempotent `--seed` flag on migrate_fulfillment.py so production runs don't re-randomise.
- P2 — Surface fulfillment badge in admin products list column (currently only in form + orders).
- P2 — Low-stock email digest (existing daily-digest scheduler could include low-stock summary).
