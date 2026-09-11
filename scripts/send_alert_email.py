#!/usr/bin/env python3
"""Send the concise alert. No-op if ALERT_SMTP_PASSWORD is unset."""

from __future__ import annotations

import os
import smtplib
import sys
from email.message import EmailMessage

DEFAULT_FROM = "eliseocab@gmail.com"
DEFAULT_TO = "eliseo.cabrera@cbp.dhs.gov,eliseocab@gmail.com"
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465


def recipients(raw: str) -> list[str]:
    return [p.strip() for p in (raw or "").split(",") if p.strip()]


def main() -> int:
    subject = (os.environ.get("ALERT_SUBJECT") or "").strip()
    body = (os.environ.get("ALERT_BODY") or "").strip()
    if not subject or not body:
        print("No ALERT_SUBJECT/ALERT_BODY; skip send.")
        return 0

    password = (os.environ.get("ALERT_SMTP_PASSWORD") or "").strip()
    user = (os.environ.get("ALERT_SMTP_USER") or "").strip() or DEFAULT_FROM
    if not password:
        print("ALERT_SMTP_PASSWORD unset; skip SMTP (GitHub failure mail only).")
        return 0

    from_addr = (os.environ.get("ALERT_FROM") or "").strip() or DEFAULT_FROM
    to_list = recipients(os.environ.get("ALERT_TO") or DEFAULT_TO)
    if not to_list:
        print("No ALERT_TO recipients; skip send.")
        return 0

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(to_list)
    msg.set_content(body)

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
        smtp.login(user, password)
        smtp.send_message(msg)
    print("Sent:", subject)
    return 0


if __name__ == "__main__":
    sys.exit(main())
