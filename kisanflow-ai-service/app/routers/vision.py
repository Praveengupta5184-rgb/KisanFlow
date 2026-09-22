import os, json
from fastapi import APIRouter, UploadFile, File, HTTPException
from ..schemas import QueueAnomalyRequest, QueueAnomalyResponse, CropQualityResponse, QueueCountResponse
from google import genai
from google.genai import types

router=APIRouter(tags=['computer-vision'])

@router.post('/queue-anomaly',response_model=QueueAnomalyResponse)
def anomaly(r:QueueAnomalyRequest):
    d=abs(r.physicalQueueCount-r.digitalQueueCount)
    return QueueAnomalyResponse(
        centreId=r.centreId,
        physicalQueueCount=r.physicalQueueCount,
        digitalQueueCount=r.digitalQueueCount,
        difference=d,
        anomalyFlag=d>=r.threshold,
        description='Physical and digital queue counts differ beyond threshold.' if d>=r.threshold else 'Counts are within the configured threshold.'
    )

@router.post('/crop-pre-screen',response_model=CropQualityResponse)
async def crop_pre_screen(image:UploadFile=File(...)):
    raw=await image.read()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(503, "Service Unavailable: GEMINI_API_KEY is not configured.")
    
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = """
        You are an expert agricultural AI. Analyze this image. 
        Determine if it is a valid crop. If it is NOT a crop (e.g. human, car, building), set 'is_crop' to false and explain.
        If it is a crop, determine the risk level (low, medium, high), confidence score (0.0 to 1.0), and list reasoning tags (e.g., 'discoloration', 'healthy', 'leaf rust').
        Respond ONLY in the following JSON format:
        {
            "is_crop": boolean,
            "risk_level": "low" | "medium" | "high",
            "confidence_score": float,
            "reasoning_tags": ["tag1", "tag2"],
            "explanation": "Brief explanation"
        }
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(data=raw, mime_type=image.content_type or 'image/jpeg'),
                prompt
            ]
        )
        
        # Clean up JSON if necessary
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        
        data = json.loads(text)
        
        if not data.get("is_crop", True):
            return CropQualityResponse(
                riskLevel="high",
                confidenceScore=data.get("confidence_score", 0.99),
                reasoningTags=["Invalid Image"],
                disclaimer="This image does not appear to contain a supported crop. Please upload a clear image of the crop/leaf."
            )
            
        return CropQualityResponse(
            riskLevel=data.get("risk_level", "medium"),
            confidenceScore=data.get("confidence_score", 0.8),
            reasoningTags=data.get("reasoning_tags", []),
            disclaimer=data.get("explanation", "Preliminary visual screening only. Final decision remains with human staff.")
        )
        
    except Exception as e:
        raise HTTPException(500, f"AI Vision Processing Failed: {str(e)}")

@router.post('/queue-count',response_model=QueueCountResponse)
async def queue_count(image:UploadFile=File(...)):
    raw=await image.read()
    import random
    count = random.randint(15, 45)
    return QueueCountResponse(
        count=count,
        confidence=0.85,
        details=f"Mocked YOLOv8 crowd detection: Found {count} individuals in queue."
    )
