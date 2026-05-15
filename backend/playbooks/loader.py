"""
SOC Assistant — Playbook YAML Loader & Matcher
Load, parse and match playbooks to alerts.
"""

import os
import yaml
from typing import Optional


_playbooks_cache: list[dict] = []


def _get_yaml_dir() -> str:
    return os.path.join(os.path.dirname(__file__), "yaml")


def load_all_playbooks(force_reload: bool = False) -> list[dict]:
    """Load all playbook YAML files from disk. Cached after first load."""
    global _playbooks_cache
    if _playbooks_cache and not force_reload:
        return _playbooks_cache

    yaml_dir = _get_yaml_dir()
    playbooks = []

    if not os.path.exists(yaml_dir):
        return playbooks

    for filename in sorted(os.listdir(yaml_dir)):
        if not filename.endswith(".yaml"):
            continue
        filepath = os.path.join(yaml_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            pb = yaml.safe_load(f)
            if pb:
                pb["_filename"] = filename
                playbooks.append(pb)

    _playbooks_cache = playbooks
    return playbooks


def get_playbook_by_id(playbook_id: str) -> Optional[dict]:
    """Get a playbook by its ID (e.g., 'PB-001')."""
    for pb in load_all_playbooks():
        if pb.get("id") == playbook_id:
            return pb
    return None


def match_playbook(
    rule_name: Optional[str] = None,
    technique_id: Optional[str] = None,
    tactic_name: Optional[str] = None,
) -> Optional[dict]:
    """
    Find the best matching playbook for an alert based on:
    1. MITRE technique ID match (highest priority)
    2. MITRE tactic name match
    3. trigger_rule match on rule_name
    
    Returns the best matching playbook or None.
    """
    playbooks = load_all_playbooks()
    if not playbooks:
        return None

    best_match = None
    best_score = 0

    for pb in playbooks:
        score = 0
        triggers = [t.lower() for t in pb.get("trigger_rules", [])]
        techniques = [t.lower() for t in pb.get("mitre_techniques", [])]
        tactics = [t.lower() for t in pb.get("mitre_tactics", [])]

        # Technique match (highest priority)
        if technique_id and technique_id.lower() in techniques:
            score += 10

        # Tactic match
        if tactic_name and tactic_name.lower() in tactics:
            score += 2

        # Rule name match
        if rule_name:
            rule_lower = rule_name.lower()
            for trigger in triggers:
                if trigger in rule_lower or rule_lower in trigger:
                    score += 2
                    break

        if score > best_score:
            best_score = score
            best_match = pb

    return best_match if best_score > 0 else None


def match_playbook_for_alert(alert_data: dict) -> Optional[dict]:
    """
    Match a playbook to a formatted alert dict.
    Uses rule_name, techniques, and tactics from the alert.
    """
    rule_name = alert_data.get("rule_name")
    techniques = alert_data.get("techniques", [])
    tactics = alert_data.get("tactics", [])

    technique_id = techniques[0] if techniques else None
    tactic_name = tactics[0] if tactics else None

    return match_playbook(
        rule_name=rule_name,
        technique_id=technique_id,
        tactic_name=tactic_name,
    )


def get_playbook_summary(playbook: dict) -> dict:
    """Return a summary of a playbook (without full investigation steps)."""
    return {
        "id": playbook.get("id"),
        "name": playbook.get("name"),
        "mitre_tactics": playbook.get("mitre_tactics", []),
        "mitre_techniques": playbook.get("mitre_techniques", []),
        "trigger_rules": playbook.get("trigger_rules", []),
        "severity_threshold": playbook.get("severity_threshold"),
        "steps_count": len(playbook.get("investigation_steps", [])),
    }
