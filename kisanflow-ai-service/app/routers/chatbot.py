"""
LLM-based AI chatbot for KisanFlow.
Routes farmer voice/text queries to Gemini and returns context-aware responses.
"""
import os
from fastapi import APIRouter, HTTPException
from ..schemas import ChatbotRequest, ChatbotResponse
from google import genai
from google.genai import types

router = APIRouter(tags=['chatbot'])

SYSTEM_PROMPT = """
You are KisanFlow AI Assistant — a helpful, empathetic AI designed to assist Indian farmers 
(primarily from Punjab) with agricultural procurement questions.

You help farmers with:
- Token/booking status queries
- MSP (Minimum Support Price) information for Wheat and Paddy
- Procurement centre directions and queue status
- Document requirements (J-Form, Aadhaar, etc.)
- Weather advisories affecting grain movement
- DBT payment status

Respond in the SAME language as the farmer's query (Hindi or English).
Be brief, clear, and compassionate. Never make up specific token numbers or queue counts.
If you do not know specific real-time data, clearly say so and suggest the farmer contact their nearest centre.
"""

@router.post('/voice-query', response_model=ChatbotResponse)
async def voice_query(r: ChatbotRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(503, "Service Unavailable: GEMINI_API_KEY is not configured.")

    try:
        client = genai.Client(api_key=api_key)

        prompt_parts = []
        if r.context:
            prompt_parts.append(types.Part(text=f"Current Context (Do not reveal to user directly unless asked):\n{r.context}\n\n"))
        prompt_parts.append(types.Part(text=f"User Query: {r.query}"))

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[types.Content(role="user", parts=prompt_parts)],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=256,
                temperature=0.4
            )
        )

        reply_text = response.text.strip() if response.text else "मुझे खेद है, अभी जवाब देने में असमर्थ हूँ। कृपया केंद्र अधिकारी से संपर्क करें।"
        return ChatbotResponse(reply=reply_text, source='gemini-2.5-flash')

    except Exception as e:
        raise HTTPException(500, f"Chatbot Error: {str(e)}")
