import os
import json
import uvicorn
from google import genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Email Triage Agent")

# Use your new API key here
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDBiobuaFpUpPjJj-foxS9R2fj2igtQQnM")
client = genai.Client(api_key=API_KEY)

class EmailRequest(BaseModel):
    email_body: str

# --- NEW DEBUG ENDPOINT ---
# Go to http://127.0.0.1:8000/list-models to see what you can use!
@app.get("/list-models")
async def list_models():
    try:
        model_list = []
        # Calling the model service
        for m in client.models.list():
            model_list.append({"name": m.name, "capabilities": m.supported_actions})
        return {"available_models": model_list}
    except Exception as e:
        return {"error": str(e)}

@app.post("/analyze-email")
async def analyze_email(request: EmailRequest):
    if not request.email_body:
        raise HTTPException(status_code=400, detail="Please provide email content")

    prompt = f"Analyze this email and return JSON with customer_name, customer_id, order_id, intent, and recommendation: {request.email_body}"

    try:
        # I am switching this to 'gemini-2.0-flash' which is the 
        # standard for the brand new SDK you are using.
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        
        raw_text = response.text
        clean_json = raw_text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_json)

    except Exception as e:
        # If gemini-2.0-flash also fails, this will show the error
        return {"error": str(e), "hint": "Check /list-models to see valid model names"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
