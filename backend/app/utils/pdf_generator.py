"""Generate a clean, evidence-labelled PDF report from supplied observations.

This utility never fetches data or invents missing values. Callers must pass
provider responses and timestamps that they have actually received.
"""
from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable


def _safe(value: Any) -> str:
    if value is None or value == "":
        return "Not available"
    if isinstance(value, (dict, list, tuple)):
        return str(value)
    return str(value)


def generate_environment_report(
    *,
    title: str,
    area_name: str,
    generated_at: str | None = None,
    provider_status: dict[str, str] | None = None,
    indicators: Iterable[dict[str, Any]] = (),
    notes: Iterable[str] = (),
) -> bytes:
    """Return PDF bytes; caller handles authenticated storage/download."""
    stamp = generated_at or datetime.now(timezone.utc).isoformat()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=17 * mm, bottomMargin=17 * mm,
        title=title[:180], author="NexoraWildfire AI",
    )
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(
        name="NXTitle", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=21, leading=26, textColor=colors.HexColor("#143b2c"),
        alignment=TA_LEFT, spaceAfter=5 * mm,
    ))
    base.add(ParagraphStyle(
        name="NXSection", parent=base["Heading2"], fontName="Helvetica-Bold",
        fontSize=12, leading=15, textColor=colors.HexColor("#176b4b"),
        spaceBefore=5 * mm, spaceAfter=2 * mm,
    ))
    base.add(ParagraphStyle(
        name="NXSmall", parent=base["BodyText"], fontSize=8, leading=11,
        textColor=colors.HexColor("#52615a"),
    ))
    story = [
        Paragraph("NEXORAWILDFIRE AI", base["NXSmall"]),
        Spacer(1, 2 * mm),
        Paragraph(title[:180], base["NXTitle"]),
        Paragraph(f"<b>Area:</b> {_safe(area_name)}", base["BodyText"]),
        Paragraph(f"<b>Generated:</b> {_safe(stamp)}", base["BodyText"]),
        Spacer(1, 3 * mm),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#b6d3c4")),
        Paragraph("Data provider status", base["NXSection"]),
    ]
    provider_rows = [["Provider", "Status"]]
    for provider, status in (provider_status or {}).items():
        provider_rows.append([_safe(provider), _safe(status)])
    if len(provider_rows) == 1:
        provider_rows.append(["No provider status supplied", "Not available"])
    provider_table = Table(provider_rows, colWidths=[75 * mm, 85 * mm], repeatRows=1)
    provider_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#143b2c")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#c9d7d0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f7f4")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(provider_table)
    story.append(Paragraph("Environmental indicators", base["NXSection"]))
    rows = [["Indicator", "Value", "Source", "Observed at"]]
    for item in indicators:
        rows.append([
            _safe(item.get("name")), _safe(item.get("value")),
            _safe(item.get("source")), _safe(item.get("observed_at")),
        ])
    if len(rows) == 1:
        rows.append(["No observations supplied", "Not available", "—", "—"])
    table = Table(rows, colWidths=[38 * mm, 28 * mm, 52 * mm, 42 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#176b4b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#c9d7d0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("WORDWRAP", (0, 0), (-1, -1), "CJK"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)
    story.append(Paragraph("Notes and limitations", base["NXSection"]))
    for note in notes:
        story.append(Paragraph(_safe(note), base["BodyText"]))
        story.append(Spacer(1, 1.5 * mm))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        "Decision-support information only. This report is not an official warning, "
        "a guarantee of safety, or a substitute for competent local authorities. "
        "Unavailable data is labelled rather than estimated.",
        base["NXSmall"],
    ))
    doc.build(story)
    return buffer.getvalue()
