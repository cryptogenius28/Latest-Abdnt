"""Resend email helper. Sends transactional emails non-blocking via asyncio.to_thread.

If RESEND_API_KEY is not set, sending is a no-op (logged), so the platform still works
without a real API key during development.
"""
import asyncio
import logging
import os
from typing import List, Optional

logger = logging.getLogger("abundant.email")


def _build_order_html(order: dict, *, brand_color: str = "#E8621A") -> str:
    items_rows = []
    for it in order.get("items", []):
        items_rows.append(
            f"""<tr>
              <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;color:#1a1a2e;">
                {it.get('title','')}<br/>
                <span style="font-size:11px;color:#888;">Qty {it.get('qty',1)}</span>
              </td>
              <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;color:#1a1a2e;text-align:right;font-weight:600;">
                ${(float(it.get('unit_price',0)) * int(it.get('qty',1))):.2f}
              </td>
            </tr>"""
        )
    addr = order.get("shipping_address", {})
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f6f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
        <tr><td style="padding:24px;background:{brand_color};color:#fff;">
          <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Abundant Merchandise</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;">Thanks for your order!</h1>
          <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">Order #{order.get('order_number','')}</p>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 16px;color:#1a1a2e;font-size:14px;line-height:1.6;">
            Hi {addr.get('first_name','there')}, we&rsquo;ve received your order and it&rsquo;s being prepared. You&rsquo;ll get another email when it ships.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            {''.join(items_rows)}
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;">
            <tr><td style="font-size:13px;color:#666;padding:4px 0;">Subtotal</td><td style="font-size:13px;color:#1a1a2e;padding:4px 0;text-align:right;">${order.get('subtotal',0):.2f}</td></tr>
            <tr><td style="font-size:13px;color:#666;padding:4px 0;">Shipping</td><td style="font-size:13px;color:#1a1a2e;padding:4px 0;text-align:right;">${order.get('shipping_cost',0):.2f}</td></tr>
            <tr><td style="font-size:13px;color:#666;padding:4px 0;">Tax</td><td style="font-size:13px;color:#1a1a2e;padding:4px 0;text-align:right;">${order.get('tax',0):.2f}</td></tr>
            <tr><td style="font-size:15px;color:#1a1a2e;padding:12px 0 0;border-top:2px solid #1a1a2e;font-weight:700;">Total paid</td><td style="font-size:18px;color:#1a1a2e;padding:12px 0 0;text-align:right;font-weight:700;border-top:2px solid #1a1a2e;">${order.get('total',0):.2f}</td></tr>
          </table>
          <div style="margin-top:24px;padding-top:24px;border-top:1px solid #eee;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;font-weight:700;">Shipping to</p>
            <p style="margin:0;font-size:14px;color:#1a1a2e;line-height:1.5;">
              {addr.get('first_name','')} {addr.get('last_name','')}<br/>
              {addr.get('address1','')}{('<br/>' + addr.get('address2','')) if addr.get('address2') else ''}<br/>
              {addr.get('city','')}, {addr.get('state','')} {addr.get('zip','')}<br/>
              {addr.get('country','United States')}
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#fafafa;font-size:11px;color:#888;text-align:center;">
          Questions? Reply to this email or visit our help center.<br/>
          &copy; 2026 Abundant Merchandise. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


async def send_order_receipt(to_email: str, order: dict) -> bool:
    """Send an HTML receipt for a paid order. Returns True if sent; False if skipped."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    if not api_key:
        logger.info("RESEND_API_KEY not set — skipping order receipt to %s (order %s)", to_email, order.get("order_number"))
        return False
    try:
        import resend  # local import to avoid module load if not used
        resend.api_key = api_key
        params = {
            "from": sender,
            "to": [to_email],
            "subject": f"Order confirmed · #{order.get('order_number','')}",
            "html": _build_order_html(order),
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Order receipt sent to %s, email_id=%s", to_email, (result or {}).get("id"))
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to send order receipt to %s: %s", to_email, e)
        return False


async def send_admin_digest(to_emails: list, summary: dict, *, brand_color: str = "#E8621A") -> bool:
    """Send the daily admin analytics digest email.

    `summary` is the dict produced by build_digest_summary() in commerce_routes.
    Returns True if sent, False if skipped (no API key) or failed.
    """
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    if not api_key or not to_emails:
        logger.info("Admin digest skipped (no api key or no recipients)")
        return False
    try:
        import resend
        resend.api_key = api_key

        def metric_box(label: str, value: str, color: str = "#1a1a2e") -> str:
            return f"""<td style="padding:12px;background:#fafafa;border-radius:8px;text-align:center;">
              <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;font-weight:700;">{label}</p>
              <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:{color};">{value}</p>
            </td>"""

        def product_row(p: dict, kind: str) -> str:
            badge_color = "#10b981" if kind == "winner" else "#f59e0b"
            badge_text = "TOP" if kind == "winner" else "LOW"
            return f"""<tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
              <table cellpadding="0" cellspacing="0" width="100%"><tr>
                <td style="vertical-align:top;">
                  <span style="display:inline-block;padding:2px 8px;font-size:9px;font-weight:700;letter-spacing:1px;color:#fff;background:{badge_color};border-radius:99px;">{badge_text}</span>
                  <p style="margin:6px 0 2px;font-size:14px;font-weight:700;color:#1a1a2e;">{p.get('title','')[:60]}</p>
                  <p style="margin:0;font-size:11px;color:#888;">
                    {p.get('views',0)} views · {p.get('cart_adds',0)} cart adds · {p.get('units_sold',0)} sold
                  </p>
                </td>
              </tr></table>
            </td></tr>"""

        winners_html = "".join(product_row(p, "winner") for p in summary.get("winners", [])[:3])
        under_html = "".join(product_row(p, "loser") for p in summary.get("underperformers", [])[:3])
        date_str = summary.get("date_label", "")
        store_url = (os.environ.get("APP_URL") or "").rstrip("/")
        admin_link = f"{store_url}/admin/analytics" if store_url else "/admin/analytics"

        html = f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f6f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
        <tr><td style="padding:24px;background:{brand_color};color:#fff;">
          <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Daily Digest</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;">Yesterday at Abundant</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">{date_str}</p>
        </td></tr>
        <tr><td style="padding:24px;">
          <table cellpadding="0" cellspacing="6" width="100%"><tr>
            {metric_box('Views', str(summary.get('views', 0)))}
            {metric_box('Cart adds', str(summary.get('cart_adds', 0)))}
          </tr><tr>
            {metric_box('Orders', str(summary.get('orders', 0)))}
            {metric_box('Revenue', f"${summary.get('revenue', 0):.2f}", brand_color)}
          </tr></table>

          <h2 style="margin:24px 0 8px;font-size:16px;color:#1a1a2e;font-weight:700;">Top performers</h2>
          <table cellpadding="0" cellspacing="0" width="100%">
            {winners_html or '<tr><td style="padding:12px 0;font-size:13px;color:#888;">No traffic-driven products yet.</td></tr>'}
          </table>

          <h2 style="margin:24px 0 8px;font-size:16px;color:#1a1a2e;font-weight:700;">Need attention</h2>
          <table cellpadding="0" cellspacing="0" width="100%">
            {under_html or '<tr><td style="padding:12px 0;font-size:13px;color:#888;">Every viewed product converted at least once. 🎉</td></tr>'}
          </table>

          <div style="margin-top:28px;text-align:center;">
            <a href="{admin_link}" style="display:inline-block;padding:12px 24px;background:{brand_color};color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;">
              Open full analytics &rarr;
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#fafafa;font-size:11px;color:#888;text-align:center;">
          You&rsquo;re receiving this because daily digests are enabled in admin settings.<br/>
          &copy; 2026 Abundant Merchandise.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

        params = {
            "from": sender,
            "to": to_emails,
            "subject": f"Daily Digest · {date_str}",
            "html": html,
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Admin digest sent to %s, email_id=%s", to_emails, (result or {}).get("id"))
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to send admin digest: %s", e)
        return False


async def send_cart_recovery(
    to_email: str,
    *,
    user_name: str,
    items: list,
    promo: Optional[dict] = None,
    store_url: str = "",
    recovery_id: Optional[str] = None,
    brand_color: str = "#E8621A",
) -> bool:
    """Send an abandoned-cart recovery email with the user's items + optional promo.

    `items`: [{title, price, image, sku}]
    `promo`: {code, description, amount, type} or None
    """
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    if not api_key or not items:
        return False
    try:
        import resend
        resend.api_key = api_key
        items_html = []
        for it in items[:6]:
            img = (it.get("image") or "").strip() or "https://placehold.co/120x120?text=%E2%80%94"
            items_html.append(f"""<tr>
              <td width="80" style="padding:8px 12px 8px 0;vertical-align:top;">
                <img src="{img}" alt="" width="72" height="72" style="border-radius:8px;display:block;object-fit:cover;border:1px solid #eee;"/>
              </td>
              <td style="padding:8px 0;vertical-align:top;">
                <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a2e;">{it.get('title','')[:80]}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#666;">${float(it.get('price') or 0):.2f}</p>
              </td>
            </tr>""")

        promo_block = ""
        if promo:
            desc = promo.get("description") or f"Use code {promo.get('code','')} at checkout"
            promo_block = f"""<div style="margin:20px 0;padding:14px 16px;background:#fff7ed;border:1px dashed {brand_color};border-radius:10px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9a3412;font-weight:700;">A little something for you</p>
              <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:{brand_color};letter-spacing:1px;">{promo.get('code','')}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#7c2d12;">{desc}</p>
            </div>"""

        cta_link = f"{store_url.rstrip('/')}/cart" if store_url else "/cart"
        if recovery_id:
            sep = "&" if "?" in cta_link else "?"
            cta_link = f"{cta_link}{sep}rcv={recovery_id}"
        html = f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f6f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
        <tr><td style="padding:24px;background:{brand_color};color:#fff;">
          <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Still shopping?</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;">You left something behind</h1>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 16px;color:#1a1a2e;font-size:14px;line-height:1.6;">
            Hi {user_name or 'there'}, your cart is still waiting for you. Pick up right where you left off.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">{''.join(items_html)}</table>
          {promo_block}
          <div style="margin-top:24px;text-align:center;">
            <a href="{cta_link}" style="display:inline-block;padding:14px 28px;background:{brand_color};color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;">
              Return to cart &rarr;
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#fafafa;font-size:11px;color:#888;text-align:center;">
          Don&rsquo;t want these reminders? Reply &ldquo;unsubscribe&rdquo; and we&rsquo;ll stop.<br/>
          &copy; 2026 Abundant Merchandise.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

        params = {
            "from": sender,
            "to": [to_email],
            "subject": "You left something behind ✨",
            "html": html,
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Cart recovery sent to %s, email_id=%s", to_email, (result or {}).get("id"))
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Cart recovery email failed for %s: %s", to_email, e)
        return False


async def send_contact_acknowledgement(to_email: str, name: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    if not api_key:
        return False
    try:
        import resend
        resend.api_key = api_key
        params = {
            "from": sender,
            "to": [to_email],
            "subject": "We received your message — Abundant Merchandise",
            "html": f"""<p>Hi {name},</p><p>Thanks for reaching out! A human will reply within 1 business hour.</p><p>— Abundant Merchandise Team</p>""",
        }
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Contact ack failed: %s", e)
        return False
