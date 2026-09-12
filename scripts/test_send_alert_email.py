#!/usr/bin/env python3
"""Tests for SMTP secret sanitization and alert-mail exit codes."""

from __future__ import annotations

import os
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import send_alert_email as mail


class SanitizeSecretTests(unittest.TestCase):
    def test_nbsp_ends_become_stripped(self):
        raw = "\xa0abcd efgh ijkl mnop\u00a0"
        self.assertEqual(mail.sanitize_secret(raw), "abcd efgh ijkl mnop")

    def test_other_unicode_spaces_replaced_then_stripped(self):
        # thin space, ideographic space, narrow no-break space
        raw = "\u2009user\u3000name\u202f"
        self.assertEqual(mail.sanitize_secret(raw), "user name")

    def test_ascii_strip_unchanged(self):
        self.assertEqual(mail.sanitize_secret("  pass  "), "pass")

    def test_empty_and_none(self):
        self.assertEqual(mail.sanitize_secret(""), "")
        self.assertEqual(mail.sanitize_secret(None), "")
        self.assertEqual(mail.sanitize_secret("\xa0\u00a0"), "")


class SendExitCodeTests(unittest.TestCase):
    def _env(self, extra: dict[str, str] | None = None):
        env = {
            "ALERT_SUBJECT": "BWT alert email test",
            "ALERT_BODY": "manual SMTP test",
            "ALERT_SMTP_PASSWORD": "app-password",
            "ALERT_SMTP_USER": "eliseocab@gmail.com",
            "ALERT_TO": "eliseocab@gmail.com",
            "ALERT_FROM": "eliseocab@gmail.com",
        }
        if extra:
            env.update(extra)
        return patch.dict(os.environ, env, clear=False)

    def test_skip_without_password_is_zero(self):
        with self._env({"ALERT_SMTP_PASSWORD": ""}):
            self.assertEqual(mail.main(), 0)

    def test_expired_with_password_is_one(self):
        with self._env(), patch.object(mail, "mail_expired", return_value=True):
            self.assertEqual(mail.main(), 1)

    def test_sent_is_zero(self):
        smtp = MagicMock()
        with (
            self._env(),
            patch.object(mail, "mail_expired", return_value=False),
            patch.object(mail.smtplib, "SMTP_SSL") as ssl,
        ):
            ssl.return_value.__enter__.return_value = smtp
            self.assertEqual(mail.main(), 0)
        smtp.login.assert_called_once_with("eliseocab@gmail.com", "app-password")
        smtp.send_message.assert_called_once()

    def test_nbsp_password_and_user_are_sanitized_before_login(self):
        smtp = MagicMock()
        with (
            self._env(
                {
                    "ALERT_SMTP_PASSWORD": "\xa0app-password\u00a0",
                    "ALERT_SMTP_USER": "\u00a0eliseocab@gmail.com\xa0",
                }
            ),
            patch.object(mail, "mail_expired", return_value=False),
            patch.object(mail.smtplib, "SMTP_SSL") as ssl,
        ):
            ssl.return_value.__enter__.return_value = smtp
            self.assertEqual(mail.main(), 0)
        smtp.login.assert_called_once_with("eliseocab@gmail.com", "app-password")

    def test_smtp_failure_is_one(self):
        with (
            self._env(),
            patch.object(mail, "mail_expired", return_value=False),
            patch.object(mail.smtplib, "SMTP_SSL") as ssl,
        ):
            ssl.return_value.__enter__.side_effect = UnicodeEncodeError(
                "ascii", "\xa0", 0, 1, "ordinal not in range(128)"
            )
            self.assertEqual(mail.main(), 1)


class ExpiryHelpersTests(unittest.TestCase):
    def test_not_expired_on_secret_date(self):
        self.assertFalse(mail.mail_expired(mail.SECRET_SET_ON))

    def test_expired_after_ttl(self):
        self.assertTrue(mail.mail_expired(date(2026, 12, 11)))


if __name__ == "__main__":
    unittest.main()
