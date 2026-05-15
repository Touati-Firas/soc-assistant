"""
SOC Assistant — Groq LLM Client
Wrapper for Groq API using LangChain.
"""

from langchain_groq import ChatGroq
from config import settings
from typing import Optional

_llm_instance: Optional[ChatGroq] = None


def get_llm() -> ChatGroq:
    """Get or create singleton ChatGroq instance."""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=settings.groq_temperature,
            max_tokens=settings.groq_max_tokens,
            max_retries=2,
        )
    return _llm_instance


async def invoke_llm(messages: list[dict]) -> str:
    """
    Invoke Groq LLM with a list of messages.
    messages: [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
    Returns the assistant's response text.
    """
    llm = get_llm()
    from langchain_core.messages import HumanMessage, SystemMessage

    lc_messages = []
    for msg in messages:
        if msg["role"] == "system":
            lc_messages.append(SystemMessage(content=msg["content"]))
        else:
            lc_messages.append(HumanMessage(content=msg["content"]))

    response = await llm.ainvoke(lc_messages)
    return response.content
