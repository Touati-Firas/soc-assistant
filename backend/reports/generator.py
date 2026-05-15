"""
SOC Assistant — Weekly PDF Report Generator
Generates automated threat intelligence reports using ReportLab.
"""

import os
import json
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)
from config import settings
from integrations.elastic import get_alert_stats, get_recent_alerts
from ml.clustering import cluster_alerts
from rag.prompts import REPORT_SUMMARY_TEMPLATE
from integrations.groq_client import invoke_llm


async def generate_weekly_report() -> str:
    """
    Generate the weekly threat intelligence PDF report.
    Returns the filepath of the generated PDF.
    """
    # Ensure output directory
    os.makedirs(settings.report_output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    filepath = os.path.join(
        settings.report_output_dir, f"soc_report_{timestamp}.pdf"
    )

    # Gather data
    stats = await get_alert_stats(time_range="now-7d")
    critical_alerts = await get_recent_alerts(days=7, size=50)
    cluster_data = await cluster_alerts(days=7)

    # Filter critical/high alerts
    critical_list = [
        a for a in critical_alerts
        if a.get("severity") in ["critical", "high"]
    ][:10]

    # Generate AI summary
    ai_summary = await _generate_ai_summary(stats, critical_list, cluster_data)

    # Build PDF
    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []
    
    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=24,
        spaceAfter=10,
        textColor=colors.HexColor("#1e293b"),
    )
    heading_style = ParagraphStyle(
        "ReportHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceAfter=8,
        textColor=colors.HexColor("#334155"),
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=10,
        spaceAfter=6,
        leading=14,
    )

    # ── Cover ──
    story.append(Spacer(1, 3 * cm))
    story.append(Paragraph("SOC Assistant", title_style))
    story.append(Paragraph("Weekly Threat Intelligence Report", heading_style))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        body_style,
    ))
    story.append(Paragraph(
        f"Period: Last 7 days",
        body_style,
    ))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#3b82f6")))
    story.append(Spacer(1, 1 * cm))

    # ── Executive Summary ──
    story.append(Paragraph("1. Executive Summary (AI-Generated)", heading_style))
    for paragraph in ai_summary.split("\n\n"):
        if paragraph.strip():
            story.append(Paragraph(paragraph.strip(), body_style))
    story.append(Spacer(1, 0.5 * cm))

    # ── Statistics ──
    story.append(Paragraph("2. Alert Statistics", heading_style))
    story.append(Paragraph(
        f"Total alerts this week: <b>{stats.get('total', 0)}</b>",
        body_style,
    ))

    # Severity table
    severity_data = stats.get("by_severity", {})
    if severity_data:
        sev_table_data = [["Severity", "Count"]]
        for sev, count in sorted(severity_data.items()):
            sev_table_data.append([sev.upper(), str(count)])

        sev_table = Table(sev_table_data, colWidths=[6 * cm, 4 * cm])
        sev_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b82f6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ]))
        story.append(sev_table)
        story.append(Spacer(1, 0.5 * cm))

    # ── Top MITRE Techniques ──
    technique_data = stats.get("by_technique", {})
    if technique_data:
        story.append(Paragraph("3. Top MITRE ATT&CK Techniques", heading_style))
        tech_table_data = [["Technique ID", "Count"]]
        for tech, count in sorted(technique_data.items(), key=lambda x: x[1], reverse=True)[:15]:
            tech_table_data.append([tech, str(count)])

        tech_table = Table(tech_table_data, colWidths=[6 * cm, 4 * cm])
        tech_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8b5cf6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f3ff")]),
        ]))
        story.append(tech_table)
        story.append(Spacer(1, 0.5 * cm))

    # ── Top 10 Critical Alerts ──
    if critical_list:
        story.append(Paragraph("4. Top Critical/High Alerts", heading_style))
        alert_table_data = [["Rule", "Severity", "Host", "Timestamp"]]
        for a in critical_list:
            alert_table_data.append([
                a.get("rule_name", "")[:40],
                a.get("severity", "").upper(),
                a.get("host", "N/A"),
                a.get("timestamp", "")[:19],
            ])

        alert_table = Table(alert_table_data, colWidths=[7 * cm, 2.5 * cm, 3 * cm, 4 * cm])
        alert_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ef4444")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fef2f2")]),
        ]))
        story.append(alert_table)
        story.append(Spacer(1, 0.5 * cm))

    # ── Clusters / Campaigns ──
    campaigns = cluster_data.get("campaigns", [])
    if campaigns:
        story.append(Paragraph("5. Campaign Detections", heading_style))
        for c in campaigns:
            story.append(Paragraph(
                f"<b>Campaign #{c['cluster_id']}</b>: {c['alert_count']} alerts | "
                f"Techniques: {', '.join(c.get('techniques', []))} | "
                f"Hosts: {', '.join(c.get('hosts_affected', [])[:5])}",
                body_style,
            ))
        story.append(Spacer(1, 0.5 * cm))

    # Build PDF
    doc.build(story)
    print(f"📄 Report generated: {filepath}")
    return filepath


async def _generate_ai_summary(
    stats: dict, critical_alerts: list[dict], cluster_data: dict
) -> str:
    """Generate AI executive summary using Groq."""
    try:
        prompt = REPORT_SUMMARY_TEMPLATE.format(
            stats_json=json.dumps(stats, indent=2, default=str)[:2000],
            critical_alerts_json=json.dumps(
                [{"rule": a.get("rule_name"), "severity": a.get("severity"),
                  "host": a.get("host")} for a in critical_alerts],
                indent=2,
            )[:2000],
            clusters_json=json.dumps(
                [{"id": c.get("cluster_id"), "count": c.get("alert_count"),
                  "techniques": c.get("techniques")} for c in cluster_data.get("clusters", [])],
                indent=2,
            )[:1000],
        )

        messages = [
            {"role": "system", "content": "Tu es un expert en threat intelligence."},
            {"role": "user", "content": prompt},
        ]
        return await invoke_llm(messages)
    except Exception as e:
        return f"AI summary generation failed: {str(e)}. Manual review required."
