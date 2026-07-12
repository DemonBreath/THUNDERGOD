#!/usr/bin/env python3
"""Build streaming-checklist.pdf from streaming-checklist.md using fpdf2."""

import re
import sys
from pathlib import Path

from fpdf import FPDF


class ChecklistPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "THUNDERGOD Streaming Setup Checklist", align="R", new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")


def strip_md(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    replacements = {
        "⚡": "*",
        "ᚦ": "Th",
        "–": "-",
        "—": "-",
        "→": "->",
        "×": "x",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text


def checkbox_line(pdf: ChecklistPDF, text: str, indent: int = 0) -> None:
    x0 = pdf.l_margin + indent
    y0 = pdf.get_y()
    box = 3.2
    if y0 + 6 > pdf.h - pdf.b_margin:
        pdf.add_page()
        y0 = pdf.get_y()

    pdf.set_draw_color(30, 30, 30)
    pdf.rect(x0, y0 + 1.1, box, box)
    pdf.set_xy(x0 + box + 2.5, y0)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(20, 20, 20)
    width = pdf.w - pdf.r_margin - pdf.get_x()
    pdf.multi_cell(width, 5.2, strip_md(text))
    pdf.ln(0.8)


def heading(pdf: ChecklistPDF, text: str, level: int) -> None:
    sizes = {1: 18, 2: 13, 3: 11}
    pdf.ln(2 if level > 1 else 0)
    if pdf.get_y() > pdf.h - pdf.b_margin - 14:
        pdf.add_page()
    pdf.set_font("Helvetica", "B", sizes.get(level, 11))
    pdf.set_text_color(15, 15, 15)
    pdf.multi_cell(0, 6.5 if level == 1 else 5.8, strip_md(text))
    if level == 2:
        y = pdf.get_y()
        pdf.set_draw_color(40, 40, 40)
        pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
        pdf.ln(2)
    else:
        pdf.ln(1)


def paragraph(pdf: ChecklistPDF, text: str) -> None:
    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 5.2, strip_md(text))
    pdf.ln(1)


def bullet(pdf: ChecklistPDF, text: str, indent: int = 0) -> None:
    pdf.set_x(pdf.l_margin + indent)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(20, 20, 20)
    pdf.multi_cell(0, 5.2, f"- {strip_md(text)}")
    pdf.ln(0.3)


def render_table(pdf: ChecklistPDF, rows: list[list[str]]) -> None:
    if not rows:
        return
    col_count = max(len(r) for r in rows)
    usable = pdf.w - pdf.l_margin - pdf.r_margin
    widths = [usable * 0.24, usable * 0.22, usable * 0.22, usable * 0.18]
    if col_count != 4:
        widths = [usable / col_count] * col_count

    if pdf.get_y() > pdf.h - pdf.b_margin - 20:
        pdf.add_page()

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(240, 240, 240)
    for i, cell in enumerate(rows[0]):
        pdf.cell(widths[i], 7, strip_md(cell)[:40], border=1, fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    for row in rows[1:]:
        if pdf.get_y() > pdf.h - pdf.b_margin - 10:
            pdf.add_page()
        for i in range(col_count):
            val = strip_md(row[i]) if i < len(row) else ""
            pdf.cell(widths[i], 7, val[:48], border=1)
        pdf.ln()
    pdf.ln(2)


def build_pdf(md_path: Path, pdf_path: Path) -> None:
    pdf = ChecklistPDF()
    pdf.set_auto_page_break(auto=True, margin=14)
    pdf.set_margins(16, 16, 16)
    pdf.add_page()

    table_rows: list[list[str]] = []
    in_table = False

    for raw_line in md_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()

        if not line.strip():
            if in_table and table_rows:
                render_table(pdf, table_rows)
                table_rows = []
                in_table = False
            pdf.ln(1)
            continue

        if line.startswith("|"):
            if re.match(r"^\|\s*-+", line):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            table_rows.append(cells)
            in_table = True
            continue

        if in_table and table_rows:
            render_table(pdf, table_rows)
            table_rows = []
            in_table = False

        if line.strip() == "---":
            pdf.ln(1.5)
            continue

        m = re.match(r"^(#{1,3})\s+(.+)$", line)
        if m:
            heading(pdf, m.group(2), len(m.group(1)))
            continue

        m = re.match(r"^>\s+(.+)$", line)
        if m:
            paragraph(pdf, m.group(1))
            continue

        m = re.match(r"^(\s*)- \[ \] (.+)$", line)
        if m:
            indent = min(len(m.group(1)) // 2, 3) * 6
            checkbox_line(pdf, m.group(2), indent=indent)
            continue

        m = re.match(r"^(\s*)- (.+)$", line)
        if m:
            indent = min(len(m.group(1)) // 2, 3) * 4
            bullet(pdf, m.group(2), indent=indent)
            continue

        if line.startswith("**") and line.endswith("**"):
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(20, 20, 20)
            pdf.multi_cell(0, 5.2, strip_md(line))
            pdf.ln(0.5)
            continue

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(20, 20, 20)
        pdf.multi_cell(0, 5.2, strip_md(line))
        pdf.ln(0.5)

    if table_rows:
        render_table(pdf, table_rows)

    pdf.output(str(pdf_path))


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    md_path = root / "streaming-checklist.md"
    pdf_path = root / "streaming-checklist.pdf"
    if not md_path.exists():
        print(f"Missing {md_path}", file=sys.stderr)
        return 1
    build_pdf(md_path, pdf_path)
    print(f"Wrote {pdf_path} ({pdf_path.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
