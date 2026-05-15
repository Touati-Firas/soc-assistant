"""
SOC Assistant — Clusters API Route
"""

from fastapi import APIRouter, HTTPException, Query
from ml.clustering import cluster_alerts

router = APIRouter()


@router.get("/clusters")
async def get_clusters(
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze"),
    eps: float = Query(0.5, ge=0.1, le=2.0, description="DBSCAN eps parameter"),
    min_samples: int = Query(3, ge=2, le=20, description="DBSCAN min_samples"),
):
    """
    Run DBSCAN clustering on recent alerts and return clusters + campaign detections.
    """
    try:
        return await cluster_alerts(days=days, eps=eps, min_samples=min_samples)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering error: {str(e)}")


# Grouper les alertes similaires ensemble
# Identifier des campagnes d'attaque coordonnées
# Séparer le bruit (alertes isolées) des vrais patterns