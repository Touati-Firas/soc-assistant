"""
SOC Assistant — Timeline API Routes
Incident timeline builder with correlated alerts.
"""
# ajouter         # Correlate by source ip in timeline_from_alert
from fastapi import APIRouter, HTTPException, Query
from integrations.elastic import (
    search_alerts_by_host,
    search_alerts_by_ip,
    search_alerts_by_user,
    get_alert_by_id,
)

router = APIRouter()


@router.get("/timeline/host/{hostname}")
async def timeline_by_host(
    hostname: str,
    time_range: str = Query("now-7d", description="Time range"),
):
    """
    Build incident timeline for a specific host.
    Aggregates all alerts for the hostname sorted chronologically.
    """
    try:
        alerts = await search_alerts_by_host(hostname, time_range)
        timeline_events = _build_timeline(alerts)
        return {
            "entity_type": "host",
            "entity": hostname,
            "time_range": time_range,
            "total_events": len(timeline_events),
            "timeline": timeline_events,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Timeline error: {str(e)}")


@router.get("/timeline/user/{username}")
async def timeline_by_user(
    username: str,
    time_range: str = Query("now-7d", description="Time range"),
):
    """
    Build incident timeline for a specific user.
    Aggregates all alerts for the user sorted chronologically.
    """
    try:
        alerts = await search_alerts_by_user(username, time_range)
        timeline_events = _build_timeline(alerts)
        return {
            "entity_type": "user",
            "entity": username,
            "time_range": time_range,
            "total_events": len(timeline_events),
            "timeline": timeline_events,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Timeline error: {str(e)}")


@router.get("/timeline/ip/{source_ip}")
async def timeline_by_ip(
    source_ip: str,
    time_range: str = Query("now-7d", description="Time range"),
):
    """
    Build incident timeline for a specific source IP.
    Aggregates all alerts for the IP sorted chronologically.
    """
    try:
        alerts = await search_alerts_by_ip(source_ip, time_range)
        timeline_events = _build_timeline(alerts)
        return {
            "entity_type": "ip",
            "entity": source_ip,
            "time_range": time_range,
            "total_events": len(timeline_events),
            "timeline": timeline_events,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Timeline error: {str(e)}")


@router.get("/timeline/alert/{alert_id}")
async def timeline_from_alert(
    alert_id: str,
    time_range: str = Query("now-7d", description="Time range"),
):
    """
    Build timeline centered on a specific alert.
    Finds correlated alerts by host and user.
    """
    try:
        alert = await get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        host = alert.get("host")
        source_ip = alert.get("source_ip")
        user = alert.get("user")

        # Correlate by host, otherwise fall back to source IP
        host_alerts = []
        entity_type = "host"
        entity = host
        if host and host != "N/A":
            host_alerts = await search_alerts_by_host(host, time_range)
        elif source_ip and source_ip != "N/A":
            host_alerts = await search_alerts_by_ip(source_ip, time_range)
            entity_type = "ip"
            entity = source_ip

        # Correlate by user
        user_alerts = []
        if user and user != "N/A":
            user_alerts = await search_alerts_by_user(user, time_range)

        # Merge and deduplicate
        all_alerts = _merge_alerts(host_alerts, user_alerts)
        timeline_events = _build_timeline(all_alerts)

        return {
            "source_alert_id": alert_id,
            "entity_type": entity_type,
            "entity": entity,
            "host": host,
            "source_ip": source_ip,
            "user": user,
            "time_range": time_range,
            "total_events": len(timeline_events),
            "timeline": timeline_events,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Timeline error: {str(e)}")


# ── Helpers ──────────────────────────────────────────────

# MITRE tactic colors for timeline visualization
TACTIC_COLORS = {
    "Reconnaissance": "#94a3b8",
    "Resource Development": "#a78bfa",
    "Initial Access": "#f97316",
    "Execution": "#ef4444",
    "Persistence": "#dc2626",
    "Privilege Escalation": "#b91c1c",
    "Defense Evasion": "#eab308",
    "Credential Access": "#f59e0b",
    "Discovery": "#22d3ee",
    "Lateral Movement": "#3b82f6",
    "Collection": "#8b5cf6",
    "Command and Control": "#6366f1",
    "Exfiltration": "#ec4899",
    "Impact": "#991b1b",
}


def _build_timeline(alerts: list[dict]) -> list[dict]:
    """Build timeline events from alert list."""
    events = []
    for alert in alerts:
        tactics = alert.get("tactics", [])
        primary_tactic = tactics[0] if tactics else "Unknown"
        color = TACTIC_COLORS.get(primary_tactic, "#64748b")

        events.append({
            "id": alert.get("id"),
            "timestamp": alert.get("timestamp"),
            "rule_name": alert.get("rule_name"),
            "severity": alert.get("severity"),
            "host": alert.get("host"),
            "user": alert.get("user"),
            "source_ip": alert.get("source_ip"),
            "tactics": tactics,
            "techniques": alert.get("techniques", []),
            "tactic_color": color,
            "status": alert.get("status"),
        })

    return events


def _merge_alerts(list1: list[dict], list2: list[dict]) -> list[dict]:
    """Merge two alert lists, removing duplicates by id."""
    seen_ids = set()
    merged = []
    for alert in list1 + list2:
        if alert.get("id") not in seen_ids:
            seen_ids.add(alert.get("id"))
            merged.append(alert)
    # Sort by timestamp
    merged.sort(key=lambda x: x.get("timestamp", ""))
    return merged

