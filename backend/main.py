"""
SOC Assistant — FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from integrations.elastic import get_es_client, close_es_client
from api.routes import alerts, analysis, playbooks, timeline, reports, clusters, auth #,ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Startup: initialize Elasticsearch client
    print("🚀 SOC Assistant starting up...")
    print(f"   Elastic: {settings.elastic_url}")
    print(f"   Groq Model: {settings.groq_model}")
    es = get_es_client()
    try:
        info = await es.info()
        print(f"   ✅ Elasticsearch connected: v{info['version']['number']}")
    except Exception as e:
        print(f"   ⚠️  Elasticsearch not reachable: {e}")
    yield
    # Shutdown: close connections
    await close_es_client()
    print("🛑 SOC Assistant shut down.")


app = FastAPI(
    title="SOC Assistant API",
    description="AI-Powered Security Operations Center — Elastic · Groq · RAG · MITRE ATT&CK",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(analysis.router, prefix="/api", tags=["AI Analysis"])
app.include_router(playbooks.router, prefix="/api", tags=["Playbooks"])
app.include_router(timeline.router, prefix="/api", tags=["Timeline"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
# app.include_router(ws.router, tags=["WebSocket"])
app.include_router(clusters.router, prefix="/api", tags=["Clusters"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "SOC Assistant",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    es = get_es_client()
    try:
        await es.ping()
        elastic_status = "connected"
    except Exception:
        elastic_status = "disconnected"

    return {
        "status": "healthy",
        "elasticsearch": elastic_status,
        "groq_model": settings.groq_model,
    }
