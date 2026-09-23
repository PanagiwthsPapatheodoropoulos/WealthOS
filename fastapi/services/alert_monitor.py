"""
WealthOS Real-Time Price Alert Background Monitor & Async Email Dispatcher
Continuously monitors live market prices against user-defined alert thresholds in PostgreSQL.
When a price crosses a target threshold, it automatically:
1. Marks the alert as TRIGGERED in the database
2. Inserts an in-app notification
3. Formats and dispatches a high-end institutional alert email to the user's inbox asynchronously.
"""

import asyncio
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy import create_engine, text

from services.market_data_feed import RealMarketDataService

logger = logging.getLogger("wealthos.alert_monitor")

def get_db_url() -> str:
    pg_host = os.getenv("DB_HOST", "postgres")
    try:
        import socket
        socket.gethostbyname("postgres")
        pg_host = "postgres"
    except Exception:
        pass

    pg_port = os.getenv("DB_PORT", "5432")
    pg_user = os.getenv("POSTGRES_USER", "postgres")
    pg_pass = os.getenv("POSTGRES_PASSWORD", "wealthos_secure_dev_pass_2026!")
    pg_db = os.getenv("POSTGRES_DB", "wealthos")
    return f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"

_engine = None


def get_db_engine():
    global _engine
    if _engine is None:
        try:
            _engine = create_engine(get_db_url(), pool_pre_ping=True, pool_size=5, max_overflow=10)
        except Exception as e:
            logger.error(f"Failed to create alert monitor db engine: {e}")
    return _engine


def resolve_currency_symbol(currency: str = None, symbol: str = None) -> str:
    c = (currency or "").strip().upper()
    if c == "EUR":
        return "€"
    if c == "GBP":
        return "£"
    if c == "USD":
        return "$"
    if c == "CHF":
        return "CHF "
    if c == "JPY":
        return "¥"
    if c == "CAD":
        return "CA$"
    if c == "AUD":
        return "AU$"
    if c:
        return f"{c} "

    s = (symbol or "").strip().upper()
    euro_suffixes = (".MI", ".DE", ".F", ".MU", ".PA", ".AS", ".BR", ".MC", ".AT", ".VI", ".HE", ".IR")
    if any(s.endswith(ext) for ext in euro_suffixes):
        return "€"
    if s.endswith(".L") or s.endswith(".IL"):
        return "£"
    if s.endswith(".SW") or s.endswith(".VX"):
        return "CHF "
    if s.endswith(".T"):
        return "¥"
    if s.endswith(".TO") or s.endswith(".V"):
        return "CA$"
    if s.endswith(".AX"):
        return "AU$"
    if s.endswith("-EUR"):
        return "€"
    if s.endswith("-GBP"):
        return "£"
    return "$"


def dispatch_email_smtp(to_email: str, subject: str, html_content: str) -> bool:
    """Dispatches a real email via configured SMTP credentials (e.g. Gmail or Brevo SMTP)."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM", "").strip() or smtp_user or "alerts@wealthos.local"

    if not smtp_user or not smtp_pass:
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"WealthOS Execution Engine <{smtp_from}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10.0)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10.0)
            server.starttls()

        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, [to_email], msg.as_string())
        server.quit()
        logger.info(f"✅ Real price alert email successfully dispatched via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to dispatch SMTP email to {to_email}: {e}")
        return False


async def send_via_brevo_api(api_key: str, to_email: str, subject: str, html_content: str, from_email: str = None) -> bool:
    """Dispatches an email via Brevo (Sendinblue) REST API with sub-second speed."""
    import httpx
    url = "https://api.brevo.com/v3/smtp/email"
    sender_email = from_email or os.getenv("SMTP_FROM", "").strip() or os.getenv("SMTP_USER", "").strip() or to_email
    headers = {
        "accept": "application/json",
        "api-key": api_key.strip(),
        "content-type": "application/json"
    }
    payload = {
        "sender": {"name": "WealthOS Institutional Alerts", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code in (200, 201):
                logger.info(f"✅ Real price alert email successfully dispatched via Brevo REST API to {to_email}")
                return True
            else:
                logger.warning(f"Brevo API error ({res.status_code}): {res.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to dispatch email via Brevo API: {e}")
        return False


async def send_via_google_sentinel(webhook_url: str, to_email: str, subject: str, html_content: str) -> bool:
    """Dispatches an email via 24/7 Google Cloud Sentinel Webhook (MailApp.sendEmail)."""
    import httpx
    try:
        payload = {
            "action": "DISPATCH_EMAIL",
            "recipientEmail": to_email,
            "subject": subject,
            "htmlBody": html_content
        }
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            res = await client.post(webhook_url.strip(), json=payload)
            if res.status_code == 200:
                logger.info(f"✅ Real price alert email successfully dispatched via Google Cloud Sentinel Webhook to {to_email}")
                return True
            else:
                logger.warning(f"Google Sentinel Webhook returned HTTP {res.status_code}: {res.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to dispatch email via Google Sentinel Webhook: {e}")
        return False


async def dispatch_alert_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Unified multi-channel email dispatcher:
    1. Brevo REST API (if BREVO_API_KEY is set in environment or .env)
    2. Google Cloud Sentinel Webhook (if GOOGLE_SENTINEL_WEBHOOK_URL is set)
    3. SMTP (if SMTP_USER and SMTP_PASSWORD are set)
    """
    target = to_email.strip()
    if not target or "@" not in target:
        logger.warning(f"Invalid target email for alert dispatch: '{target}'")
        return False

    # 1. Try Brevo REST API
    brevo_key = os.getenv("BREVO_API_KEY", "").strip()
    if brevo_key:
        ok = await send_via_brevo_api(brevo_key, target, subject, html_content)
        if ok:
            return True

    # 2. Try Google Cloud Sentinel Webhook
    google_url = os.getenv("GOOGLE_SENTINEL_WEBHOOK_URL", "").strip()
    if google_url:
        ok = await send_via_google_sentinel(google_url, target, subject, html_content)
        if ok:
            return True

    # 3. Try SMTP
    smtp_ok = dispatch_email_smtp(target, subject, html_content)
    if smtp_ok:
        return True

    logger.info(
        f"[Email Simulation] Alert triggered for {target} but no email provider is configured. "
        f"Subject: '{subject}'. Set BREVO_API_KEY or GOOGLE_SENTINEL_WEBHOOK_URL to deliver real emails."
    )
    return False


def build_alert_email_html(
    symbol: str,
    asset_name: str,
    condition: str,
    target_price: float,
    live_price: float,
    currency_symbol: str,
    recipient_email: str,
    time_str: str,
) -> str:
    """Renders a sleek institutional price alert email template."""
    cond_text = "Crossed Above (≥)" if condition == "ABOVE" else "Dropped Below (≤)"
    badge_bg = "#ecfdf5" if condition == "ABOVE" else "#fef2f2"
    badge_color = "#047857" if condition == "ABOVE" else "#b91c1c"
    badge_border = "#a7f3d0" if condition == "ABOVE" else "#fecaca"

    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background: #09090b; padding: 24px; color: #ffffff;">
            <div style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #10b981; text-transform: uppercase;">WealthOS Sub-Second Monitoring Engine</div>
            <h1 style="font-size: 20px; font-weight: 800; margin: 6px 0 2px 0; color: #ffffff;">Price Alert Triggered</h1>
            <div style="font-size: 12px; color: #94a3b8;">Monitored for <strong>{recipient_email}</strong> &bull; {time_str}</div>
        </div>

        <div style="padding: 24px;">
            <!-- Trigger Card -->
            <div style="background: {badge_bg}; border: 1px solid {badge_border}; border-left: 5px solid {badge_color}; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <div>
                        <span style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">{symbol}</span>
                        <span style="font-size: 12px; color: #64748b; margin-left: 6px;">{asset_name}</span>
                    </div>
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #ffffff; color: {badge_color}; border: 1px solid {badge_border};">
                        {cond_text}
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; padding-top: 12px; border-top: 1px dashed {badge_border};">
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Target Threshold</div>
                        <div style="font-size: 16px; font-weight: 800; color: #0f172a; font-family: monospace;">{currency_symbol}{target_price:.2f}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Live Execution Price</div>
                        <div style="font-size: 16px; font-weight: 800; color: {badge_color}; font-family: monospace;">{currency_symbol}{live_price:.2f}</div>
                    </div>
                </div>
            </div>

            <!-- Action Advice Box -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
                <strong style="font-size: 12px; color: #0f172a;">Institutional Stance & Action Required</strong>
                <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0; line-height: 1.5;">
                    Your target threshold has been met. Review your portfolio allocation on the WealthOS Terminal or execute your scheduled order in accordance with your risk parameters.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center;">
            WealthOS Autonomous Surveillance Engine &bull; Automated Asynchronous Dispatch
        </div>
    </div>
    """


async def evaluate_and_trigger_alerts() -> Dict[str, Any]:
    """
    Core evaluation function:
    1. Fetches all ACTIVE alerts from PostgreSQL.
    2. Fetches real-time market prices.
    3. Evaluates condition and triggers matches.
    4. Updates database, creates notification, and dispatches email asynchronously.
    """
    engine = get_db_engine()
    if not engine:
        return {"checked": 0, "triggered": 0, "error": "Database not accessible"}

    try:
        with engine.connect() as conn:
            query = text("""
                SELECT 
                    a.id, 
                    a.user_id, 
                    u.email, 
                    COALESCE(u.first_name, 'Investor') AS first_name,
                    ast.symbol, 
                    ast.name AS asset_name, 
                    a.condition, 
                    CAST(a.target_price AS FLOAT) AS target_price,
                    COALESCE(ast.currency, 'USD') AS currency
                FROM alerts a
                JOIN users u ON a.user_id = u.id
                JOIN assets ast ON a.asset_id = ast.id
                WHERE a.status = 'ACTIVE';
            """)
            rows = conn.execute(query).fetchall()

        if not rows:
            return {"checked": 0, "triggered": 0, "message": "No active alerts to monitor"}

        # Collect unique symbols
        symbols = list({r.symbol for r in rows})
        batch = await RealMarketDataService.fetch_batch_quotes(symbols)
        quotes = batch.get("quotes", {})

        triggered_list = []
        now_utc = datetime.now(timezone.utc)
        now_str = now_utc.strftime("%d %b %Y, %H:%M UTC")

        for r in rows:
            sym = r.symbol
            quote = quotes.get(sym, {})
            live_price = float(quote.get("price") or 0.0)

            if live_price <= 0.0:
                continue

            cond = (r.condition or "ABOVE").upper()
            target = float(r.target_price)

            is_triggered = False
            if cond == "ABOVE" and live_price >= target:
                is_triggered = True
            elif cond == "BELOW" and live_price <= target:
                is_triggered = True

            if is_triggered:
                curr_sym = resolve_currency_symbol(r.currency, sym)
                
                # 1. Update Alert status in PostgreSQL
                with engine.begin() as conn:
                    conn.execute(
                        text("UPDATE alerts SET status = 'TRIGGERED', triggered_at = :now WHERE id = :id"),
                        {"now": now_utc, "id": r.id}
                    )
                    # 2. Insert Notification
                    notif_title = f"Price Alert: {sym} {cond} {curr_sym}{target:.2f}"
                    notif_msg = f"{sym} reached {curr_sym}{live_price:.2f} (Target: {curr_sym}{target:.2f})."
                    conn.execute(
                        text("""
                            INSERT INTO notifications (id, user_id, title, body, type, read, created_at)
                            VALUES (gen_random_uuid(), :user_id, :title, :message, 'ALERT_TRIGGERED', false, :now)
                        """),
                        {"user_id": r.user_id, "title": notif_title, "message": notif_msg, "now": now_utc}
                    )

                # 3. Asynchronously format & dispatch email
                target_recipient = os.getenv("TARGET_ALERT_EMAIL", "").strip() or r.email
                email_html = build_alert_email_html(
                    symbol=sym,
                    asset_name=r.asset_name or sym,
                    condition=cond,
                    target_price=target,
                    live_price=live_price,
                    currency_symbol=curr_sym,
                    recipient_email=target_recipient,
                    time_str=now_str,
                )
                subject = f"[WealthOS Alert] {sym} Target Triggered ({curr_sym}{live_price:.2f})"
                sent = await dispatch_alert_email(target_recipient, subject, email_html)

                logger.info(
                    f"🎯 ALERT TRIGGERED: {sym} reached {curr_sym}{live_price:.2f} (Target: {curr_sym}{target:.2f}). "
                    f"User: {target_recipient}, Email Sent: {sent}"
                )

                triggered_list.append({
                    "alertId": str(r.id),
                    "symbol": sym,
                    "condition": cond,
                    "targetPrice": target,
                    "livePrice": live_price,
                    "email": target_recipient,
                    "emailSent": sent,
                })

        return {
            "checked": len(rows),
            "triggered": len(triggered_list),
            "triggeredAlerts": triggered_list,
        }
    except Exception as e:
        logger.error(f"Error evaluating price alerts: {e}", exc_info=True)
        return {"checked": 0, "triggered": 0, "error": str(e)}


async def price_alert_monitor_loop(poll_interval: int = 300):
    """Gentle adaptive background loop evaluating price alerts (default: 5 minutes / 300s)."""
    current_interval = int(os.getenv("ALERT_POLL_INTERVAL_SECONDS", str(poll_interval)))
    logger.info(f"🚀 WealthOS Adaptive Price Alert Daemon started (Interval: {current_interval}s)")
    while True:
        try:
            res = await evaluate_and_trigger_alerts()
            if res.get("triggered", 0) > 0:
                logger.info(f"Processed {res['triggered']} triggered alerts.")
        except Exception as e:
            logger.error(f"Price alert loop exception: {e}")
        
        # Read interval dynamically in case user adjusted it
        sleep_sec = int(os.getenv("ALERT_POLL_INTERVAL_SECONDS", "300"))
        await asyncio.sleep(sleep_sec)


async def sync_alerts_to_google_cloud(webhook_url: str = None, recipient_email: str = None) -> Dict[str, Any]:
    """
    Syncs all active alerts from PostgreSQL to the 24/7 Google Cloud Sentinel Webhook.
    Guarantees continuous, zero-cost surveillance even when the local computer is powered off.
    """
    url = (webhook_url or os.getenv("GOOGLE_SENTINEL_WEBHOOK_URL", "")).strip()
    if not url:
        return {"success": False, "error": "No Google Cloud Sentinel Webhook URL configured."}

    engine = get_db_engine()
    if not engine:
        return {"success": False, "error": "Database not accessible"}

    try:
        with engine.connect() as conn:
            query = text("""
                SELECT 
                    a.id, 
                    u.email, 
                    ast.symbol, 
                    ast.name AS asset_name, 
                    a.condition, 
                    CAST(a.target_price AS FLOAT) AS target_price,
                    COALESCE(ast.currency, 'USD') AS currency
                FROM alerts a
                JOIN users u ON a.user_id = u.id
                JOIN assets ast ON a.asset_id = ast.id
                WHERE a.status = 'ACTIVE';
            """)
            rows = conn.execute(query).fetchall()

        target_mail = (recipient_email or os.getenv("TARGET_ALERT_EMAIL", "")).strip()
        if not target_mail:
            target_mail = rows[0].email if rows else os.getenv("SMTP_USER", "").strip()

        alerts_payload = [
            {
                "id": str(r.id),
                "symbol": r.symbol,
                "name": r.asset_name or r.symbol,
                "condition": r.condition,
                "targetPrice": float(r.target_price),
                "currency": r.currency,
                "email": target_mail,
            }
            for r in rows
        ]

        payload = {
            "action": "SYNC_ALERTS",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "recipientEmail": target_mail,
            "alerts": alerts_payload,
        }

        import httpx
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code in (200, 302):
                return {
                    "success": True,
                    "count": len(alerts_payload),
                    "statusCode": resp.status_code,
                    "cloudResponse": resp.text[:200]
                }
            else:
                return {
                    "success": False,
                    "statusCode": resp.status_code,
                    "error": f"HTTP {resp.status_code}: {resp.text[:200]}"
                }
    except Exception as e:
        logger.error(f"Error syncing alerts to Google Cloud Sentinel: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


