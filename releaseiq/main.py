# main.py
# Flask app that receives Gmail trigger and runs ReleaseIQ

import os
import json
import base64
from flask import Flask, request, jsonify
from agent import run_agent
from notifier import send_gmail_reply, send_teams_notification

app = Flask(__name__)


def parse_email_trigger(pubsub_message):
    """Extracts customer name, order ID and sender from the Pub/Sub message."""
    try:
        data = base64.b64decode(pubsub_message["data"]).decode("utf-8")
        email_data = json.loads(data)
        subject = email_data.get("subject", "")
        sender = email_data.get("sender", "marcus@acmemedical.com")

        # Expected subject format: CREDIT HOLD: Northfield University Hospital ORD-2026-4471
        if not subject.upper().startswith("CREDIT HOLD:"):
            return None

        # Parse customer name and order ID from subject
        parts = subject.split(":")
        details = parts[1].strip()
        tokens = details.rsplit(" ", 1)
        customer_name = tokens[0].strip()
        order_id = tokens[1].strip() if len(tokens) > 1 else "UNKNOWN"

        return {
            "customer_name": customer_name,
            "order_id": order_id,
            "sender": sender,
            "original_subject": subject
        }
    except Exception as e:
        print(f"[ReleaseIQ] Failed to parse email: {e}")
        return None


@app.route("/trigger", methods=["POST"])
def trigger():
    """Receives Pub/Sub push notification from Gmail and runs ReleaseIQ."""
    try:
        envelope = request.get_json()
        if not envelope or "message" not in envelope:
            return jsonify({"error": "Invalid Pub/Sub message"}), 400

        parsed = parse_email_trigger(envelope["message"])
        if not parsed:
            print("[ReleaseIQ] Email ignored — not a CREDIT HOLD subject")
            return jsonify({"status": "ignored"}), 200

        customer_name = parsed["customer_name"]
        order_id = parsed["order_id"]
        sender = parsed["sender"]

        print(
            f"[ReleaseIQ] Triggered for {customer_name} / {order_id} from {sender}")

        # Build the agent message
        agent_message = (
            f"Marcus has a $3M MRI order for {customer_name} on credit hold. "
            f"Order ID is {order_id}. "
            f"Investigate, validate tax certificate TAX-EXEMPT-NUH-2026.pdf, "
            f"get Finance Director Joe Smith to approve a $353,000 credit limit increase, "
            f"and execute all resolution actions."
        )

        # Run ReleaseIQ
        result = run_agent(agent_message)
        print(f"[ReleaseIQ] Resolution complete.")

        # Notify Marcus via email reply
        send_gmail_reply(
            to=sender,
            subject=f"RE: {parsed['original_subject']}",
            body=f"Hi Marcus,\n\nReleaseIQ has resolved the credit hold for {customer_name}.\n\n{result}\n\nRegards,\nReleaseIQ"
        )

        # Notify Teams channel
        send_teams_notification(
            title=f"Credit Hold Resolved: {customer_name}",
            message=result
        )

        return jsonify({"status": "resolved", "customer": customer_name}), 200

    except Exception as e:
        print(f"[ReleaseIQ] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ReleaseIQ is running"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
