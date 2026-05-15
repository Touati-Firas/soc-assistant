"""
SOC Assistant — AI Analysis API Routes
RAG + LLM analysis and chatbot endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from integrations.elastic import get_alert_by_id
from rag.chain import analyze_alert, chat

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""


@router.post("/analyze/{alert_id}")
async def analyze_alert_endpoint(alert_id: str):
    """
    Trigger RAG + LLM analysis for a specific alert.
    Retrieves alert from Elastic, fetches relevant playbook context via kNN search,
    and generates AI analysis using Groq.
    """
    try:
        alert = await get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        analysis = await analyze_alert(alert)
        return {
            "alert_id": alert_id,
            "alert_summary": {
                "rule_name": alert.get("rule_name"),
                "severity": alert.get("severity"),
                "host": alert.get("host"),
                "user": alert.get("user"),
            },
            "analysis": analysis,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.post("/chat")
async def chatbot(request: ChatRequest):
    """
    SOC Chatbot — ask questions about alerts, MITRE ATT&CK, playbooks, etc.
    """
    try:
        response = await chat(
            user_message=request.message,
            context=request.context,
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")
