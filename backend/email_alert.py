import os
import asyncio
import logging
from email.message import EmailMessage

import aiosmtplib
from dotenv import load_dotenv

load_dotenv(encoding="utf-8-sig")

logger = logging.getLogger(__name__)


async def send_high_drift_alert(filename, alert_features):
    val = os.getenv("DISABLE_EMAIL_ALERT", "").strip().lower()
    if val in ("1", "true", "yes", "on"):
        logger.info("Email alert skipped: DISABLE_EMAIL_ALERT is active.")
        return False

    sender_email = os.getenv("GMAIL_SENDER_EMAIL")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    receiver_email = os.getenv("ALERT_RECEIVER_EMAIL")

    if not all([sender_email, app_password, receiver_email]):
        logger.warning("Email alert skipped: Gmail configuration is missing.")
        return False

    message = EmailMessage()
    message["From"] = sender_email
    message["To"] = receiver_email
    message["Subject"] = "ModelWatch - HIGH Drift Alert"

    features = ", ".join(alert_features)

    message.set_content(
        f"""
ModelWatch has detected HIGH severity drift.

Dataset: {filename}

Affected Features:
{features}

Please review the latest drift report in ModelWatch.

This is an automated notification.
"""
    )

    try:
        coro = aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=465,
            use_tls=True,
            username=sender_email,
            password=app_password,
            timeout=2.0
        )
        await asyncio.wait_for(coro, timeout=2.5)

        logger.info("HIGH drift alert email sent successfully.")
        return True

    except Exception as e:
        logger.warning(f"Failed to send HIGH drift alert email (offline or timed out): {e}")
        return False
