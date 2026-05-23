# agent.py
# ReleaseIQ core agent loop

import os
import json
from google import genai
from google.genai import types
from mock_apis import (
    get_oracle_order,
    get_sap_credit_profile,
    get_servicenow_disputes,
    validate_tax_certificate,
    request_credit_approval,
    execute_resolution
)

SYSTEM_PROMPT = """You are ReleaseIQ, an intelligent credit hold resolution agent for ACME Medical Equipment.

Your job is to help sales representatives resolve order credit holds quickly by coordinating across enterprise systems.

When a credit hold is reported, you must:
1. Pull the order details from Oracle
2. Pull the customer's credit profile from SAP
3. Check for any open disputes in ServiceNow
4. Validate any uploaded tax exemption documents
5. Summarize the root cause of the hold
6. Recommend a resolution plan
7. If a credit limit increase is needed, request human approval before proceeding
8. Only execute corrective actions (fix SAP invoice, update tax profile, close disputes, release hold) AFTER approval is received

Always explain your reasoning at each step. Never take irreversible actions without explicit human approval."""


def handle_function_call(name, args):
    """Routes function calls from the agent to the correct mock API."""
    print(f"\n[ReleaseIQ] Calling tool: {name} with args: {args}")
    if name == "get_oracle_order":
        return get_oracle_order(**args)
    elif name == "get_sap_credit_profile":
        return get_sap_credit_profile(**args)
    elif name == "get_servicenow_disputes":
        return get_servicenow_disputes(**args)
    elif name == "validate_tax_certificate":
        return validate_tax_certificate(**args)
    elif name == "request_credit_approval":
        return request_credit_approval(**args)
    elif name == "execute_resolution":
        return execute_resolution(**args)
    else:
        return {"error": f"Unknown function: {name}"}


def run_agent(initial_message):
    """Runs the ReleaseIQ agent loop until resolution is complete."""
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    model = "gemini-3.1-flash-lite"

    tools = [types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="get_oracle_order",
            description="Retrieves order details from Oracle for a given order ID or customer name.",
            parameters=genai.types.Schema(
                type=genai.types.Type.OBJECT,
                required=["customer_name"],
                properties={
                    "customer_name": genai.types.Schema(type=genai.types.Type.STRING),
                    "order_id": genai.types.Schema(type=genai.types.Type.STRING),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_sap_credit_profile",
            description="Retrieves the customer's credit profile from SAP.",
            parameters=genai.types.Schema(
                type=genai.types.Type.OBJECT,
                required=["customer_name"],
                properties={
                    "customer_name": genai.types.Schema(type=genai.types.Type.STRING),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_servicenow_disputes",
            description="Fetches any open disputes in ServiceNow related to the customer.",
            parameters=genai.types.Schema(
                type=genai.types.Type.OBJECT,
                required=["customer_name"],
                properties={
                    "customer_name": genai.types.Schema(type=genai.types.Type.STRING),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="validate_tax_certificate",
            description="Validates an uploaded tax exemption certificate for a customer.",
            parameters=genai.types.Schema(
                type=genai.types.Type.OBJECT,
                required=["customer_name"],
                properties={
                    "customer_name": genai.types.Schema(type=genai.types.Type.STRING),
                    "document_id": genai.types.Schema(type=genai.types.Type.STRING),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="request_credit_approval",
            description="Sends a credit limit increase request to the Finance Director via Microsoft Teams.",
            parameters=genai.types.Schema(
                type=genai.types.Type.OBJECT,
                required=["customer_name",
                          "requested_increase", "justification"],
                properties={
                    "customer_name": genai.types.Schema(type=genai.types.Type.STRING),
                    "requested_increase": genai.types.Schema(type=genai.types.Type.NUMBER),
                    "justification": genai.types.Schema(type=genai.types.Type.STRING),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="execute_resolution",
            description="Executes all corrective actions after human approval.",
            parameters=genai.types.Schema(
                type=genai.types.Type.OBJECT,
                required=["customer_name", "actions"],
                properties={
                    "customer_name": genai.types.Schema(type=genai.types.Type.STRING),
                    "actions": genai.types.Schema(
                        type=genai.types.Type.ARRAY,
                        items=genai.types.Schema(type=genai.types.Type.STRING),
                    ),
                },
            ),
        ),
    ])]

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=tools,
    )

    # Start conversation
    contents = [types.Content(
        role="user", parts=[types.Part.from_text(text=initial_message)])]
    final_response = ""

    # Agentic loop - keeps running until no more tool calls
    while True:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )

        candidate = response.candidates[0]
        contents.append(types.Content(
            role="model", parts=candidate.content.parts))

        # Check if there are function calls to handle
        function_calls = [
            p for p in candidate.content.parts if p.function_call]

        if not function_calls:
            # No more tool calls — agent is done
            final_response = "".join(
                p.text for p in candidate.content.parts if p.text)
            break

        # Execute all function calls and feed results back
        tool_results = []
        for part in function_calls:
            fc = part.function_call
            result = handle_function_call(fc.name, dict(fc.args))
            tool_results.append(
                types.Part.from_function_response(
                    name=fc.name,
                    response={"result": result}
                )
            )

        contents.append(types.Content(role="user", parts=tool_results))

    return final_response


if __name__ == "__main__":
    # Quick test
    message = "Marcus has a $3M MRI order for Northfield University Hospital on credit hold. Order ID is ORD-2026-4471. Investigate, validate tax certificate TAX-EXEMPT-NUH-2026.pdf, get Finance Director Joe Smith to approve a $353,000 credit limit increase, and execute all resolution actions."
    result = run_agent(message)
    print("\n=== FINAL RESPONSE ===")
    print(result)
