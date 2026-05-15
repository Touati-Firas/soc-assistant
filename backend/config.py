"""
SOC Assistant — Configuration
Centralized settings loaded from .env file.
"""

from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Elasticsearch ---
    elastic_url: str = "https://localhost:9200"
    elastic_user: str = "elastic"
    elastic_password: str = ""
    elastic_verify_certs: bool = True
    elastic_ca_cert: str = r"C:\Users\firas\Downloads\ca.crt"
    elastic_alert_index: str = ".alerts-security.alerts-*"
    elastic_vector_index: str = "soc-playbooks-vectors"

    # --- Groq LLM ---
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_max_tokens: int = 1024
    groq_temperature: float = 0.1

    # --- Embeddings ---
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dims: int = 384

    # --- Reports ---
    report_output_dir: str = "./reports_output"

    # --- Notifications ---
    notification_severity_threshold: str = "high"
    slack_webhook_url: Optional[str] = None

    # --- App ---
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
