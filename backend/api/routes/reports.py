"""
SOC Assistant — Reports API Routes
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from reports.generator import generate_weekly_report
import os

router = APIRouter()


@router.get("/report/weekly")
async def get_weekly_report():
    """
    Generate and download the weekly threat intelligence PDF report.
    """
    try:
        filepath = await generate_weekly_report()
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Report generation failed")
        return FileResponse(
            path=filepath,
            filename=os.path.basename(filepath),
            media_type="application/pdf",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report error: {str(e)}")
