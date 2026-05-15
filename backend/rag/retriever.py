"""
SOC Assistant — RAG Retriever
Elasticsearch kNN similarity search for playbook chunks.
"""

from integrations.elastic import get_es_client
from rag.ingestion import get_embedding_model
from config import settings
from typing import Optional


async def retrieve(
    query_text: str,
    top_k: int = 5,
    technique_filter: Optional[str] = None,
) -> list[dict]:
    """
    Perform kNN similarity search on the playbook vector index.
    
    Args:
        query_text: The text to search for (alert description, rule name, etc.)
        top_k: Number of results to return
        technique_filter: Optional MITRE technique ID to filter by
        
    Returns:
        List of matching playbook chunks with scores.
    """
    es = get_es_client()
    model = get_embedding_model()

    # Encode query
    query_vector = model.encode(query_text).tolist()

    # Build kNN query
    knn_query = {
        "field": "embedding",
        "query_vector": query_vector,
        "k": top_k,
        "num_candidates": top_k * 10,
    }

    # Optional filter by MITRE technique
    if technique_filter:
        knn_query["filter"] = {
            "term": {"mitre_techniques": technique_filter}
        }

    result = await es.search(
        index=settings.elastic_vector_index,
        knn=knn_query,
        size=top_k,
        source=["content", "playbook_id", "playbook_name", "chunk_type",
                "mitre_techniques", "mitre_tactics", "step_id"],
    )

    documents = []
    for hit in result["hits"]["hits"]:
        doc = hit["_source"]
        doc["score"] = hit["_score"]
        documents.append(doc)

    return documents


async def retrieve_context_string(
    query_text: str,
    top_k: int = 5,
    technique_filter: Optional[str] = None,
) -> str:
    """
    Retrieve relevant documents and format as a single context string
    for inclusion in the LLM prompt.
    """
    docs = await retrieve(query_text, top_k, technique_filter)
    if not docs:
        return "Aucun document de référence trouvé."

    context_parts = []
    for i, doc in enumerate(docs, 1):
        header = f"[Doc {i} — {doc['playbook_name']} ({doc['chunk_type']})]"
        context_parts.append(f"{header}\n{doc['content']}")

    return "\n\n".join(context_parts)
