# mock_apis.py
# Simulates responses from Oracle, SAP, ServiceNow and other systems

import time


def get_oracle_order(customer_name, order_id=None):
    time.sleep(2)
    return {
        "order_id": order_id or "ORD-2026-4471",
        "customer_name": customer_name,
        "sales_rep": "Marcus",
        "order_value": 300000,
        "product": "MRI Scanner - Model X9",
        "status": "credit_hold",
        "hold_reason": "Exceeds available credit limit",
        "order_date": "2026-05-20",
        "requested_delivery": "2026-06-15"
    }


def get_sap_credit_profile(customer_name):
    return {
        "customer_name": customer_name,
        "current_credit_limit": 100000000,
        "outstanding_balance": 2650000,
        "available_credit": 7350000,
        "overdue_invoices": 2,
        "overdue_amount": 124000,
        "tax_exemption_status": "expired"
    }


def get_servicenow_disputes(customer_name):
    time.sleep(5)
    import requests
    import os

    instance = "dev212326"
    username = os.environ.get("SNOW_USER", "admin")
    password = os.environ.get("SNOW_PASS", "")

    try:
        response = requests.get(
            f"https://{instance}.service-now.com/api/now/table/incident",
            params={
                "sysparm_query": "caller_id.nameLIKENorthfield University Hospital^stateIN1,2",
                "sysparm_fields": "number,short_description,state,description",
                "sysparm_limit": "10"
            },
            auth=(username, password),
            headers={"Accept": "application/json"},
            timeout=10
        )

        data = response.json().get("result", [])

        state_map = {"1": "open", "2": "in_progress",
                     "6": "resolved", "7": "closed"}

        disputes = []
        for item in data:
            disputes.append({
                "id": item.get("number"),
                "type": item.get("short_description"),
                "status": state_map.get(item.get("state"), "unknown")
            })

        return {
            "customer_name": customer_name,
            "open_disputes": len(disputes),
            "disputes": disputes,
            "source": "ServiceNow LIVE"
        }

    except Exception as e:
        print(f"[ReleaseIQ] ServiceNow API error: {e}")
        return {
            "customer_name": customer_name,
            "open_disputes": 0,
            "disputes": [],
            "source": "ServiceNow ERROR"
        }


def validate_tax_certificate(customer_name, document_id=None):
    time.sleep(2)
    return {
        "document_id": document_id or "TAX-EXEMPT-NUH-2026.pdf",
        "customer_name": customer_name,
        "status": "valid",
        "expiry_date": "2027-12-31",
        "validated_by": "ReleaseIQ Document Validator",
        "notes": "Certificate successfully validated. Tax exemption active."
    }


def request_credit_approval(customer_name, requested_increase, justification):
    time.sleep(3)
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import os

    gmail_user = os.environ.get("GMAIL_USER", "vinpuj@gmail.com")
    gmail_app_password = os.environ.get("GMAIL_APP_PASSWORD", "")

    subject = f"ACTION REQUIRED: Credit Limit Increase for {customer_name}"
    body = f"""Hi Joe,

ReleaseIQ requires your approval for the following credit limit increase:

Customer: {customer_name}
Requested Increase: ${requested_increase:,.0f}
Justification: {justification}

Approval Request ID: APR-2026-0091

Please reply APPROVED to proceed with the credit hold resolution.

Regards,
ReleaseIQ"""

    try:
        msg = MIMEMultipart()
        msg["From"] = gmail_user
        msg["To"] = "vinpuj@gmail.com"
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_app_password)
            server.sendmail(gmail_user, "vinpuj@gmail.com", msg.as_string())

        print(f"[ReleaseIQ] Approval request email sent to vinpuj@gmail.com")
        return {
            "status": "sent",
            "approval_request_id": "APR-2026-0091",
            "sent_to": "Vineet Pujari via email",
            "channel": "Email",
            "requested_increase": requested_increase,
            "message": f"Approval request for ${requested_increase:,.0f} sent to Joe Smith via email."
        }
    except Exception as e:
        print(f"[ReleaseIQ] Approval email error: {e}")
        return {"status": "error", "detail": str(e)}


def execute_resolution(customer_name, actions):
    import requests
    import os

    instance = "dev212326"
    username = os.environ.get("SNOW_USER", "admin")
    password = os.environ.get("SNOW_PASS", "")

    # Fetch open incidents for the customer
    try:
        response = requests.get(
            f"https://{instance}.service-now.com/api/now/table/incident",
            params={
                "sysparm_query": "caller_id.nameLIKENorthfield University Hospital^stateIN1,2",
                "sysparm_fields": "sys_id,number,short_description,state",
                "sysparm_limit": "10"
            },
            auth=(username, password),
            headers={"Accept": "application/json"},
            timeout=10
        )
        incidents = response.json().get("result", [])

        # Add "DISPUTE RESOLVED" comment and close each incident
        resolved = []
        for incident in incidents:
            sys_id = incident.get("sys_id")
            number = incident.get("number")

            # Add work note comment
            requests.put(
                f"https://{instance}.service-now.com/api/now/table/incident/{sys_id}",
                json={
                    "work_notes": "DISPUTE RESOLVED — ReleaseIQ credit hold resolution completed.",
                    "state": "6",
                    "incident_state": "6",
                    "close_code": "Resolved by caller",
                    "close_notes": "Resolved automatically by ReleaseIQ agent."
                },
                auth=(username, password),
                headers={"Content-Type": "application/json",
                         "Accept": "application/json"},
                timeout=10
            )
            resolved.append(number)
            print(f"[ReleaseIQ] ServiceNow {number} resolved with comment.")

    except Exception as e:
        print(f"[ReleaseIQ] ServiceNow update error: {e}")
        resolved = []

    return {
        "status": "success",
        "customer_name": customer_name,
        "actions_completed": [
            {"action": "fix_sap_invoice", "status": "done",
                "detail": "Invoice corrected, $124,000 overdue balance reconciled"},
            {"action": "update_tax_profile", "status": "done",
                "detail": "Tax exemption certificate updated, valid through 2027-12-31"},
            {"action": "close_servicenow_disputes", "status": "done",
                "detail": f"Incidents {', '.join(resolved)} resolved with comment in ServiceNow"},
            {"action": "release_oracle_hold", "status": "done",
                "detail": "Credit hold released on ORD-2026-4471. Order approved for fulfillment"}
        ],
        "resolution_time": "4 minutes",
        "order_status": "released_for_fulfillment"
    }
