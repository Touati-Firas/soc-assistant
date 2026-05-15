from datetime import datetime
from elasticsearch import AsyncElasticsearch 
from config import settings
from typing import Optional


_es_client: Optional[AsyncElasticsearch] = None


def get_es_client() -> AsyncElasticsearch:
    """Get or create singleton Elasticsearch async client."""
    global _es_client
    if _es_client is None:
        _es_client = AsyncElasticsearch(
            hosts=[settings.elastic_url],
            basic_auth=(settings.elastic_user, settings.elastic_password),
            verify_certs=settings.elastic_verify_certs,
            ca_certs=settings.elastic_ca_cert,
            request_timeout=30,
        )
    return _es_client


async def close_es_client():
    """Close Elasticsearch connection on app shutdown."""
    global _es_client
    if _es_client:
        await _es_client.close()
        _es_client = None


async def fetch_alerts(
    page: int = 1,
    size: int = 20,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    time_range: str = "now-24h",
) -> dict:
    """
    Fetch security alerts from Elastic SIEM.
    Returns paginated alert list from .alerts-security.alerts-*
    """
    es = get_es_client()
    from_offset = (page - 1) * size

    must_clauses = [
        {"range": {"@timestamp": {"gte": time_range, "lte": "now"}}}
    ]
    if severity:
        must_clauses.append({"match": {"kibana.alert.severity": severity}})
    if status:
        must_clauses.append({"match": {"kibana.alert.workflow_status": status}})

    query = {
        "bool": {
            "must": must_clauses
        }
    }
    
    result = await es.search(
        index=settings.elastic_alert_index,
        query=query,
        from_=from_offset,
        size=size,
        sort=[{"@timestamp": {"order": "desc"}}],
    )

    total = result["hits"]["total"]["value"]
    alerts = []
    for hit in result["hits"]["hits"]:
        src = hit["_source"]
        alerts.append(_format_alert(hit["_id"], src))

    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
        "alerts": alerts,
    }


async def get_alert_by_id(alert_id: str) -> Optional[dict]:
    """Fetch a single alert by its _id."""
    try:
        hit = await _get_alert_hit_by_id(alert_id)
        if hit:
            return _format_alert_detail(hit["_id"], hit["_source"])
        return None
    except Exception:
        return None


async def _get_alert_hit_by_id(alert_id: str) -> Optional[dict]:
    """Fetch the raw Elasticsearch hit for an alert by ID."""
    es = get_es_client()
    result = await es.search(
        index=settings.elastic_alert_index,
        query={"ids": {"values": [alert_id]}},
        size=1,
    )
    if result["hits"]["hits"]:
        return result["hits"]["hits"][0]
    return None


async def close_alert_by_id(alert_id: str, close_reason: str, closed_by: str = "unknown") -> dict:
    """Mark an alert as closed and store the close reason."""
    es = get_es_client()
    timestamp = datetime.utcnow().isoformat() + "Z"
    hit = await _get_alert_hit_by_id(alert_id)
    if not hit:
        raise ValueError("Alert not found")

    result = await es.update(
        index=hit["_index"],
        id=alert_id,
        doc={
            "kibana": {
                "alert": {
                    "workflow_status": "closed",
                    "workflow_status_updated_at": timestamp,
                    "workflow_reason": close_reason,
                }
            },
            "soc": {
                "close_reason": close_reason,
                "closed_at": timestamp,
                "closed_by": closed_by,
            },
        },
        refresh="wait_for",
    )

    return {
        "alert_id": alert_id,
        "status": "closed",
        "close_reason": close_reason,
        "result": result.get("result", "updated"),
    }


async def search_alerts_by_host(
    hostname: str, time_range: str = "now-7d"
) -> list[dict]:
    """Find all alerts for a given hostname (for timeline)."""
    es = get_es_client()
    result = await es.search(
        index=settings.elastic_alert_index,
        query={
            "bool": {
                "must": [
                    {"match": {"host.name": hostname}},
                    {"range": {"@timestamp": {"gte": time_range, "lte": "now"}}},
                ]
            }
        },
        sort=[{"@timestamp": {"order": "asc"}}],
        size=200,
    )
    alerts = []
    for h in result["hits"]["hits"]:
        formatted_alert = _format_alert(h["_id"], h["_source"])
        alerts.append(formatted_alert)
    return alerts
    # return [_format_alert(h["_id"], h["_source"]) for h in result["hits"]["hits"]]


async def search_alerts_by_user(
    username: str, time_range: str = "now-7d"
) -> list[dict]:
    """Find all alerts for a given user (for correlation)."""
    es = get_es_client()
    result = await es.search(
        index=settings.elastic_alert_index,
        query={
            "bool": {
                "must": [
                    {"match": {"user.name": username}},
                    {"range": {"@timestamp": {"gte": time_range, "lte": "now"}}},
                ]
            }
        },
        sort=[{"@timestamp": {"order": "asc"}}],
        size=200,
    )
    return [_format_alert(h["_id"], h["_source"]) for h in result["hits"]["hits"]]


async def search_alerts_by_ip(
    source_ip: str, time_range: str = "now-7d"
) -> list[dict]:
    """Find all alerts for a given source IP (for timeline)."""
    es = get_es_client()
    result = await es.search(
        index=settings.elastic_alert_index,
        query={
            "bool": {
                "must": [
                    {"term": {"source.ip": source_ip}},
                    {"range": {"@timestamp": {"gte": time_range, "lte": "now"}}},
                ]
            }
        },
        sort=[{"@timestamp": {"order": "asc"}}],
        size=200,
    )
    return [_format_alert(h["_id"], h["_source"]) for h in result["hits"]["hits"]]


async def get_recent_alerts(days: int = 7, size: int = 500) -> list[dict]:
    """Fetch recent alerts for ML clustering."""
    es = get_es_client()
    result = await es.search(
        index=settings.elastic_alert_index,
        query={
            "range": {"@timestamp": {"gte": f"now-{days}d", "lte": "now"}}
        },
        sort=[{"@timestamp": {"order": "desc"}}],
        size=size,
    )
    return [_format_alert(h["_id"], h["_source"]) for h in result["hits"]["hits"]]


async def get_alert_stats(time_range: str = "now-7d") -> dict:
    """Get alert statistics for dashboard and reports."""
    es = get_es_client()
    result = await es.search(
        index=settings.elastic_alert_index,
        query={"range": {"@timestamp": {"gte": time_range, "lte": "now"}}},
        size=0,
        # size=0 signifie : "Ne me retourne pas les alertes individuelles, seulement les agrégations"

        aggs={
            "by_severity": {
                "terms": {"field": "kibana.alert.severity", "size": 10}
            },
            "by_rule": {
                "terms": {"field": "kibana.alert.rule.name", "size": 20}
            },
            "by_tactic": {
                "terms": {"field": "kibana.alert.rule.threat.tactic.name", "size": 20}
            },
            "by_technique": {
                "terms": {"field": "kibana.alert.rule.threat.technique.id", "size": 30}
            },
            "over_time": {
                "date_histogram": {
                    "field": "@timestamp",
                    "calendar_interval": "day",
                }
            },
        },
    )

    aggs = result.get("aggregations", {})

    return {
        "total": result["hits"]["total"]["value"],
        "by_severity": _buckets_to_dict(aggs.get("by_severity", {})),
        "by_rule": _buckets_to_dict(aggs.get("by_rule", {})),
        "by_tactic": _buckets_to_dict(aggs.get("by_tactic", {})),
        "by_technique": _buckets_to_dict(aggs.get("by_technique", {})),
        "over_time": [
            {"date": b["key_as_string"], "count": b["doc_count"]}
            for b in aggs.get("over_time", {}).get("buckets", [])
        ],
    }

# ── Helpers ──────────────────────────────────────────────

def _safe_get(d: dict, *keys, default=None):
    """Safely navigate nested dicts."""
    for key in keys:
        if isinstance(d, dict):
            d = d.get(key, default)
        else:
            return default
    return d


def _format_alert(alert_id: str, src: dict) -> dict:
    """Format an alert hit into a concise dict for list views."""
    threat = _safe_get(src, "kibana.alert.rule.threat", default=[])
    if not isinstance(threat, list):
        threat = [threat] if threat else []
        
    tactics = []
    techniques = []
    for t in threat:
        if isinstance(t, dict):
            tac = _safe_get(t, "tactic", "name", default=None)
            if tac:
                tactics.append(tac)
            techs = t.get("technique", [])
            if isinstance(techs, list):
                for tech in techs:
                    tid = _safe_get(tech, "id", default=None)
                    if tid:
                        techniques.append(tid)

    return {
        "id": alert_id,
        "timestamp": src.get("@timestamp", ""),
        "rule_name": _safe_get(src, "kibana.alert.rule.name", default="Unknown"),
        "severity": _safe_get(src, "kibana.alert.severity", default="unknown"),
        "host": _safe_get(src, "host", "name", default="N/A"),
        "user": _safe_get(src, "user", "name", default="N/A"),
        "source_ip": _safe_get(src, "source", "ip", default="N/A"),
        "tactics": tactics,
        "techniques": techniques,
        "status": _safe_get(
            src, "kibana.alert.workflow_status", default="open"
        ),
        "close_reason": _safe_get(src, "soc", "close_reason", default=""),
        "closed_by": _safe_get(src, "soc", "closed_by", default=""),
        "closed_at": _safe_get(src, "soc", "closed_at", default=""),
    }


def _format_alert_detail(alert_id: str, src: dict) -> dict:
    """Format full alert detail including all fields for popup."""
    base = _format_alert(alert_id, src)
    base.update({
        "destination_ip": _safe_get(src, "destination", "ip", default="N/A"),
        "destination_port": _safe_get(src, "destination", "port", default="N/A"),
        "process_name": _safe_get(src, "process", "name", default="N/A"),
        "process_pid": _safe_get(src, "process", "pid", default="N/A"),
        "process_command_line": _safe_get(
            src, "process", "command_line", default="N/A"
        ),
        "file_path": _safe_get(src, "file", "path", default="N/A"),
        "event_action": _safe_get(src, "event", "action", default="N/A"),
        "event_category": _safe_get(src, "event", "category", default="N/A"),
        "agent_name": _safe_get(src, "agent", "name", default="N/A"),
        "rule_description": _safe_get(
            src, "kibana.alert.rule.description", default=""
        ),
        "risk_score": _safe_get(
            src, "kibana.alert.risk_score", default=0
        ),
        "raw": src,  # full raw source for advanced users
    })
    return base


def _buckets_to_dict(agg: dict) -> dict:
    """Convert ES agg buckets to {key: count} dict."""
    return {
        b["key"]: b["doc_count"]
        for b in agg.get("buckets", [])
    }

