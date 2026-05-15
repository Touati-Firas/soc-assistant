"""
SOC Assistant — Alerts API Routes
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from integrations.elastic import fetch_alerts, get_alert_by_id, get_alert_stats

router = APIRouter()


@router.get("/alerts")
async def list_alerts(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    severity: Optional[str] = Query(None, description="Filter by severity: critical, high, medium, low"),
    status: Optional[str] = Query(None, description="Filter by status: open, closed"),
    time_range: str = Query("now-7d", description="Time range (e.g., now-24h, now-7d)"),
):
    """
    List security alerts from Elastic SIEM with pagination and filtering.
    """
    try:
        result = await fetch_alerts(
            page=page,
            size=size,
            severity=severity,
            status=status,
            time_range=time_range,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Elasticsearch error: {str(e)}")


@router.get("/alerts/stats")
async def alert_statistics(
    time_range: str = Query("now-7d", description="Time range for stats"),
):
    """
    Get alert statistics: severity distribution, top rules, MITRE tactics/techniques, trends.
    """
    try:
        return await get_alert_stats(time_range=time_range)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Elasticsearch error: {str(e)}")


@router.get("/alerts/{alert_id}")
async def get_alert(alert_id: str):
    """
    Get full details of a single alert by ID.
    Used by the popup detail modal.
    """
    try:
        alert = await get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Elasticsearch error: {str(e)}")
