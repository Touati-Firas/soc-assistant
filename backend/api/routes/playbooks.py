"""
SOC Assistant — Playbooks API Routes
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from auth import verify_token
from integrations.elastic import get_alert_by_id, close_alert_by_id
from playbooks.loader import (
    load_all_playbooks,
    get_playbook_by_id,
    match_playbook_for_alert,
    get_playbook_summary,
)

router = APIRouter()


class CloseAlertRequest(BaseModel):
    close_reason: str

# In-memory step completion tracking (in production, use Redis or DB)
_step_status: dict[str, dict[int, bool]] = {}  # {alert_id: {step_id: completed}}


@router.get("/playbooks")
async def list_playbooks():
    """List all available playbooks with summary info."""
    playbooks = load_all_playbooks()
    return {
        "total": len(playbooks),
        "playbooks": [get_playbook_summary(pb) for pb in playbooks],
    }


@router.get("/playbook/match/{alert_id}")
async def get_playbook_for_alert(alert_id: str):
    """
    Find the best matching playbook for a given alert.
    Matches based on rule_name, MITRE technique, and tactic.
    """
    try:
        alert = await get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        playbook = match_playbook_for_alert(alert)
        if not playbook:
            return {
                "alert_id": alert_id,
                "matched": False,
                "message": "No matching playbook found for this alert.",
            }

        # Include step completion status
        steps = playbook.get("investigation_steps", [])
        alert_steps = _step_status.get(alert_id, {})
        for step in steps:
            step["completed"] = alert_steps.get(step.get("id", 0), False)

        return {
            "alert_id": alert_id,
            "matched": True,
            "playbook": playbook,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Playbook error: {str(e)}")


@router.get("/playbook/{playbook_id}")
async def get_playbook(playbook_id: str):
    """Get a playbook by its ID."""
    playbook = get_playbook_by_id(playbook_id)
    if not playbook:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return playbook


@router.put("/playbook/{alert_id}/step/{step_id}")
async def toggle_step(alert_id: str, step_id: int):
    """
    Toggle completion status of a playbook step for an alert.
    Used by the interactive checklist in the frontend.
    """
    if alert_id not in _step_status:
        _step_status[alert_id] = {}

    current = _step_status[alert_id].get(step_id, False)
    _step_status[alert_id][step_id] = not current

    return {
        "alert_id": alert_id,
        "step_id": step_id,
        "completed": not current,
    }


@router.post("/playbook/{alert_id}/close")
async def close_alert(
    alert_id: str,
    payload: CloseAlertRequest,
    authorization: Optional[str] = Header(None),
):
    """Close an alert from the playbook workflow with a selected reason."""
    try:
        alert = await get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        closed_by = "unknown"
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            payload_data = verify_token(token)
            if payload_data and payload_data.get("sub"):
                closed_by = payload_data["sub"]

        return await close_alert_by_id(alert_id, payload.close_reason, closed_by=closed_by)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Playbook error: {str(e)}")
