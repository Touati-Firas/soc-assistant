"""
SOC Assistant — ML Clustering (DBSCAN)
Detect similar alerts and attack campaigns.
"""

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler, LabelEncoder
from typing import Optional
from integrations.elastic import get_recent_alerts


# Severity ordinal encoding
SEVERITY_MAP = {
    "low": 0,
    "medium": 1,
    "high": 2,
    "critical": 3,
}


async def cluster_alerts(
    days: int = 7,
    eps: float = 0.5,
    min_samples: int = 3,
) -> dict:
    """
    Fetch recent alerts and cluster them using DBSCAN.
    
    Features used:
    - technique_id (encoded)
    - severity (ordinal)
    - source_ip /24 (encoded)
    - rule_name (encoded)
    - time_window_bucket (hourly)
    
    Returns cluster assignments and campaign detections.
    """
    alerts = await get_recent_alerts(days=days)
    if len(alerts) < min_samples:
        return {
            "total_alerts": len(alerts),
            "clusters": [],
            "campaigns": [],
            "noise_count": len(alerts),
        }

    # Extract features
    features, valid_alerts = _extract_features(alerts)
    if len(features) < min_samples:
        return {
            "total_alerts": len(alerts),
            "clusters": [],
            "campaigns": [],
            "noise_count": len(alerts),
        }

    # Normalize features
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    # Run DBSCAN
    dbscan = DBSCAN(eps=eps, min_samples=min_samples, metric="euclidean")
    labels = dbscan.fit_predict(features_scaled)

    # Build cluster results
    clusters = _build_clusters(valid_alerts, labels)
    campaigns = _detect_campaigns(clusters)

    noise_count = sum(1 for label in labels if label == -1)

    return {
        "total_alerts": len(valid_alerts),
        "total_clusters": len(clusters),
        "clusters": clusters,
        "campaigns": campaigns,
        "noise_count": noise_count,
    }


def _extract_features(alerts: list[dict]) -> tuple[np.ndarray, list[dict]]:
    """Extract numeric feature vectors from alerts."""
    valid_alerts = []
    raw_techniques = []
    raw_ips = []
    raw_rules = []

    for alert in alerts:
        techniques = alert.get("techniques", [])
        technique = techniques[0] if techniques else "none"
        raw_techniques.append(technique)
        raw_ips.append(_ip_to_subnet(alert.get("source_ip", "0.0.0.0")))
        raw_rules.append(alert.get("rule_name", "unknown"))
        valid_alerts.append(alert)

    if not valid_alerts:
        return np.array([]), []

    # Encode categorical features
    tech_encoder = LabelEncoder()
    ip_encoder = LabelEncoder()
    rule_encoder = LabelEncoder()

    tech_encoded = tech_encoder.fit_transform(raw_techniques)
    ip_encoded = ip_encoder.fit_transform(raw_ips)
    rule_encoded = rule_encoder.fit_transform(raw_rules)

    features = []
    for i, alert in enumerate(valid_alerts):
        severity = SEVERITY_MAP.get(alert.get("severity", "low"), 0)
        timestamp = alert.get("timestamp", "")
        hour_bucket = _timestamp_to_bucket(timestamp)

        feature_vector = [
            tech_encoded[i] * 0.4,       # technique (weight 0.4)
            severity * 0.3,               # severity (weight 0.3)
            ip_encoded[i] * 0.15,         # source IP subnet (weight 0.15)
            rule_encoded[i] * 0.1,        # rule name (weight 0.1)
            hour_bucket * 0.05,           # time bucket (weight 0.05)
        ]
        features.append(feature_vector)

    return np.array(features), valid_alerts


def _build_clusters(
    alerts: list[dict], labels: np.ndarray
) -> list[dict]:
    """Group alerts by cluster label."""
    cluster_map: dict[int, list[dict]] = {}
    for alert, label in zip(alerts, labels):
        if label == -1:  # noise
            continue
        label_int = int(label)
        if label_int not in cluster_map:
            cluster_map[label_int] = []
        cluster_map[label_int].append(alert)

    clusters = []
    for cluster_id, cluster_alerts in sorted(cluster_map.items()):
        # Determine cluster characteristics
        techniques = set()
        tactics = set()
        severities = []
        hosts = set()
        rules = set()

        for a in cluster_alerts:
            techniques.update(a.get("techniques", []))
            tactics.update(a.get("tactics", []))
            severities.append(a.get("severity", "low"))
            if a.get("host") != "N/A":
                hosts.add(a.get("host"))
            rules.add(a.get("rule_name", ""))

        # Highest severity in cluster
        max_severity = max(
            severities,
            key=lambda s: SEVERITY_MAP.get(s, 0),
            default="low",
        )

        clusters.append({
            "cluster_id": cluster_id,
            "alert_count": len(cluster_alerts),
            "techniques": list(techniques),
            "tactics": list(tactics),
            "max_severity": max_severity,
            "hosts_affected": list(hosts),
            "rules": list(rules),
            "alerts": cluster_alerts,
            "time_span": _calculate_time_span(cluster_alerts),
        })

    return clusters


def _detect_campaigns(clusters: list[dict]) -> list[dict]:
    """
    Detect potential attack campaigns.
    Campaign criteria: cluster with 10+ alerts in a 2-hour window.
    """
    campaigns = []
    for cluster in clusters:
        if cluster["alert_count"] >= 10:
            time_span = cluster.get("time_span", {})
            # If time span < 2 hours, it's a concentrated campaign
            campaigns.append({
                "cluster_id": cluster["cluster_id"],
                "alert_count": cluster["alert_count"],
                "techniques": cluster["techniques"],
                "tactics": cluster["tactics"],
                "severity": "critical",
                "hosts_affected": cluster["hosts_affected"],
                "description": f"Potential attack campaign detected: {cluster['alert_count']} related alerts",
                "time_span": time_span,
            })
    return campaigns


def _ip_to_subnet(ip: str) -> str:
    """Convert IP to /24 subnet for grouping."""
    try:
        parts = ip.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.{parts[2]}.0"
    except Exception:
        pass
    return "0.0.0.0"


def _timestamp_to_bucket(timestamp: str) -> int:
    """Convert timestamp to hourly bucket for clustering."""
    try:
        # Extract hour from ISO timestamp
        if "T" in timestamp:
            time_part = timestamp.split("T")[1]
            hour = int(time_part.split(":")[0])
            return hour
    except Exception:
        pass
    return 0


def _calculate_time_span(alerts: list[dict]) -> dict:
    """Calculate the time span of a cluster."""
    timestamps = [a.get("timestamp", "") for a in alerts if a.get("timestamp")]
    if not timestamps:
        return {"first": "", "last": ""}
    timestamps.sort()
    return {"first": timestamps[0], "last": timestamps[-1]}
