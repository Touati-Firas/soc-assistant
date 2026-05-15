"""
SOC Assistant — RAG Chain
Full RAG pipeline: retrieve context → build prompt → call Groq → parse response.
"""

import json
from rag.retriever import retrieve_context_string
from rag.prompts import SOC_SYSTEM_PROMPT, ALERT_ANALYSIS_TEMPLATE, CHATBOT_SYSTEM_PROMPT
from integrations.groq_client import invoke_llm


async def analyze_alert(alert_data: dict) -> dict:
    """
    Full RAG analysis pipeline for a single alert.
    
    1. Build query from alert fields
    2. Retrieve relevant playbook chunks from Elasticsearch
    3. Build prompt with alert + MITRE context + RAG docs
    4. Call Groq LLM
    5. Parse structured JSON response
    
    Returns dict with analysis results.
    """
    # Build search query from alert
    query_parts = [
        alert_data.get("rule_name", ""),
        " ".join(alert_data.get("tactics", [])),
        " ".join(alert_data.get("techniques", [])),
    ]
    query_text = " ".join(filter(None, query_parts))

    # Get first technique for filtering
    technique_filter = None
    techniques = alert_data.get("techniques", [])
    if techniques:
        technique_filter = techniques[0]

    # Retrieve RAG context from Elasticsearch
    rag_context = await retrieve_context_string(
        query_text=query_text,
        top_k=5,
        technique_filter=technique_filter,
    )

    # Build prompt
    user_prompt = ALERT_ANALYSIS_TEMPLATE.format(
        rule_name=alert_data.get("rule_name", "N/A"),
        severity=alert_data.get("severity", "N/A"),
        timestamp=alert_data.get("timestamp", "N/A"),
        host=alert_data.get("host", "N/A"),
        user=alert_data.get("user", "N/A"),
        source_ip=alert_data.get("source_ip", "N/A"),
        event_action=alert_data.get("event_action", "N/A"),
        tactics=", ".join(alert_data.get("tactics", ["N/A"])),
        techniques=", ".join(alert_data.get("techniques", ["N/A"])),
        rag_context=rag_context,
    )

    # Call LLM
    messages = [
        {"role": "system", "content": SOC_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
    response_text = await invoke_llm(messages)

    # Parse JSON response
    analysis = _parse_llm_response(response_text)
    analysis["rag_documents_used"] = len(rag_context.split("[Doc ")) - 1
    analysis["raw_response"] = response_text

    return analysis


async def chat(user_message: str, context: str = "") -> str:
    """
    SOC Chatbot — conversational assistant.
    
    Args:
        user_message: The analyst's question
        context: Optional additional context (current alert, etc.)
        
    Returns:
        Assistant's response text.
    """
    # Retrieve relevant docs for the question
    rag_context = await retrieve_context_string(query_text=user_message, top_k=3)

    full_message = user_message
    if context:
        full_message = f"Contexte actuel:\n{context}\n\nQuestion: {user_message}"
    if rag_context and rag_context != "Aucun document de référence trouvé.":
        full_message += f"\n\nDocuments de référence:\n{rag_context}"

    messages = [
        {"role": "system", "content": CHATBOT_SYSTEM_PROMPT},
        {"role": "user", "content": full_message},
    ]
    return await invoke_llm(messages)


def _parse_llm_response(response_text: str) -> dict:
    """Parse the LLM's JSON response, handling edge cases."""
    # Try to extract JSON from the response
    text = response_text.strip()

    # Remove markdown code block if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # If JSON parsing fails, return a structured fallback
        return {
            "severity_assessment": "unknown",
            "attack_stage": "unknown",
            "summary": response_text[:500],
            "iocs": [],
            "investigation_priority": "medium",
            "recommended_actions": ["Review the alert manually"],
            "false_positive_probability": 0.5,
            "related_techniques": [],
            "analyst_notes": "LLM response could not be parsed as JSON. Raw response included.",
            "parse_error": True,
        }
