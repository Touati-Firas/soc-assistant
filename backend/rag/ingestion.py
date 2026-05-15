"""
SOC Assistant — RAG Ingestion
Index playbooks into Elasticsearch vector index using dense_vector.
"""

import os
import yaml
from sentence_transformers import SentenceTransformer
from elasticsearch import Elasticsearch
from config import settings

_model = None


def get_embedding_model() -> SentenceTransformer:
    """Lazy-load the embedding model."""
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def create_vector_index(es: Elasticsearch):
    """Create the Elasticsearch vector index for playbook embeddings."""
    index_name = settings.elastic_vector_index

    if es.indices.exists(index=index_name):
        print(f"   Index '{index_name}' already exists.")
        return

    mapping = {
        "mappings": {
            "properties": {
                "content": {"type": "text"},
                "embedding": {
                    "type": "dense_vector",
                    "dims": settings.embedding_dims,
                    "index": True,
                    "similarity": "cosine",
                },
                "playbook_id": {"type": "keyword"},
                "playbook_name": {"type": "keyword"},
                "mitre_techniques": {"type": "keyword"},
                "mitre_tactics": {"type": "keyword"},
                "trigger_rules": {"type": "keyword"},
                "chunk_type": {"type": "keyword"},  # step, remediation, overview
                "step_id": {"type": "integer"},
            }
        },
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
        },
    }

    es.indices.create(index=index_name, body=mapping)
    print(f"   ✅ Created vector index: {index_name}")


def chunk_playbook(playbook: dict) -> list[dict]:
    """Split a playbook into indexable chunks."""
    chunks = []
    pb_id = playbook.get("id", "unknown")
    pb_name = playbook.get("name", "")
    techniques = playbook.get("mitre_techniques", [])
    tactics = playbook.get("mitre_tactics", [])
    triggers = playbook.get("trigger_rules", [])

    # Overview chunk
    overview = f"Playbook: {pb_name}\n"
    overview += f"MITRE Tactics: {', '.join(tactics)}\n"
    overview += f"MITRE Techniques: {', '.join(techniques)}\n"
    overview += f"Trigger Rules: {', '.join(triggers)}\n"
    overview += f"Severity Threshold: {playbook.get('severity_threshold', 'N/A')}"
    chunks.append({
        "content": overview,
        "playbook_id": pb_id,
        "playbook_name": pb_name,
        "mitre_techniques": techniques,
        "mitre_tactics": tactics,
        "trigger_rules": triggers,
        "chunk_type": "overview",
        "step_id": 0,
    })

    # Investigation step chunks
    for step in playbook.get("investigation_steps", []):
        step_text = f"Step {step.get('id', '?')}: {step.get('title', '')}\n"
        step_text += f"Description: {step.get('description', '')}\n"
        if step.get("elastic_query"):
            step_text += f"Elastic Query: {step['elastic_query']}\n"
        if step.get("expected_finding"):
            step_text += f"Expected Finding: {step['expected_finding']}\n"
        if step.get("tools"):
            step_text += f"Tools: {', '.join(step['tools'])}\n"
        if step.get("critical"):
            step_text += "⚠️ CRITICAL STEP — Escalate if found\n"

        chunks.append({
            "content": step_text,
            "playbook_id": pb_id,
            "playbook_name": pb_name,
            "mitre_techniques": techniques,
            "mitre_tactics": tactics,
            "trigger_rules": triggers,
            "chunk_type": "step",
            "step_id": step.get("id", 0),
        })

    # Remediation chunk
    remediation = playbook.get("remediation", {})
    if remediation:
        rem_text = "Remediation:\n"
        for key, actions in remediation.items():
            if isinstance(actions, list):
                rem_text += f"  {key}: {', '.join(actions)}\n"
            else:
                rem_text += f"  {key}: {actions}\n"
        chunks.append({
            "content": rem_text,
            "playbook_id": pb_id,
            "playbook_name": pb_name,
            "mitre_techniques": techniques,
            "mitre_tactics": tactics,
            "trigger_rules": triggers,
            "chunk_type": "remediation",
            "step_id": 0,
        })

    return chunks


def index_playbooks(playbooks_dir: str = None):
    """
    Load all YAML playbooks from disk and index them into Elasticsearch.
    This is a synchronous operation meant to be run as a setup script.
    """
    if playbooks_dir is None:
        playbooks_dir = os.path.join(
            os.path.dirname(__file__), "..", "playbooks", "yaml"
        )

    # Use sync client for ingestion script
    es = Elasticsearch(
        hosts=[settings.elastic_url],
        basic_auth=(settings.elastic_user, settings.elastic_password),
        verify_certs=settings.elastic_verify_certs,
        ca_certs=settings.elastic_ca_cert,
    )

    print("📚 RAG Ingestion — Indexing playbooks into Elasticsearch...")
    create_vector_index(es)

    model = get_embedding_model()
    total_chunks = 0

    yaml_files = [f for f in os.listdir(playbooks_dir) if f.endswith(".yaml")]
    print(f"   Found {len(yaml_files)} playbook files.")

    for filename in yaml_files:
        filepath = os.path.join(playbooks_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            playbook = yaml.safe_load(f)

        chunks = chunk_playbook(playbook)
        print(f"   Processing {filename}: {len(chunks)} chunks")

        for chunk in chunks:
            embedding = model.encode(chunk["content"]).tolist()
            doc = {
                "content": chunk["content"],
                "embedding": embedding,
                "playbook_id": chunk["playbook_id"],
                "playbook_name": chunk["playbook_name"],
                "mitre_techniques": chunk["mitre_techniques"],
                "mitre_tactics": chunk["mitre_tactics"],
                "trigger_rules": chunk["trigger_rules"],
                "chunk_type": chunk["chunk_type"],
                "step_id": chunk["step_id"],
            }
            es.index(index=settings.elastic_vector_index, document=doc)
            total_chunks += 1

    # Refresh index for immediate search
    es.indices.refresh(index=settings.elastic_vector_index)
    print(f"   ✅ Indexed {total_chunks} chunks from {len(yaml_files)} playbooks.")
    es.close()


if __name__ == "__main__":
    index_playbooks()
