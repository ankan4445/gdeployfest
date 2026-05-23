# notifier.py
# Handles Gmail reply and Microsoft Teams webhook notifications

import os
import json
import requests

TEAMS_WEBHOOK_URL = os.environ.get("TEAMS_WEBHOOK_URL", "")


def send_gmail_reply(to, subject, body):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    gmail_user = os.environ.get("GMAIL_USER", "vinpuj@gmail.com")
    gmail_app_password = os.environ.get("GMAIL_APP_PASSWORD", "")

    try:
        msg = MIMEMultipart()
        msg["From"] = gmail_user
        msg["To"] = "vinpuj@gmail.com"
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_app_password)
            server.sendmail(gmail_user, "vinpuj@gmail.com", msg.as_string())

        print(f"[ReleaseIQ] Gmail sent successfully to vinpuj@gmail.com")
        return {"status": "sent", "to": "vinpuj@gmail.com"}

    except Exception as e:
        print(f"[ReleaseIQ] Gmail error: {e}")
        return {"status": "error", "detail": str(e)}


def send_teams_notification(title, message):
    import requests
    import json

    webhook_url = os.environ.get("TEAMS_WEBHOOK_URL", "")

    if not webhook_url:
        print(f"[ReleaseIQ] Teams notification skipped — no webhook configured.")
        return {"status": "skipped"}

    payload = {
        "title": title,
        "message": message
    }

    try:
        response = requests.post(
            webhook_url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=15
        )
        print(
            f"[ReleaseIQ] Teams notification sent. Status: {response.status_code}")
        return {"status": "sent", "code": response.status_code}
    except Exception as e:
        print(f"[ReleaseIQ] Teams notification error: {e}")
        return {"status": "error", "detail": str(e)}

    try:
        response = requests.post(
            TEAMS_WEBHOOK_URL,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=10
        )
        if response.status_code == 200:
            print(f"[ReleaseIQ] Teams notification sent successfully.")
            return {"status": "sent"}
        else:
            print(f"[ReleaseIQ] Teams webhook failed: {response.status_code}")
            return {"status": "failed", "code": response.status_code}
    except Exception as e:
        print(f"[ReleaseIQ] Teams notification error: {e}")
        return {"status": "error", "detail": str(e)}
