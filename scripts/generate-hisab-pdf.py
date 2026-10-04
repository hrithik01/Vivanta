#!/usr/bin/env python3
"""
दैनिक हिसाब एवं रूम शीट — multi-page A4 PDF generator.

Builds one blank sheet per day, with the date and weekday pre-printed in Hindi.

Usage:
    python3 scripts/generate-hisab-pdf.py                 # 14 days from today
    python3 scripts/generate-hisab-pdf.py 2026-09-22 14   # 14 days from a date
"""

import sys
from datetime import date, timedelta
from pathlib import Path

from weasyprint import HTML

HINDI_WEEKDAYS = [
    "सोमवार",    # Monday
    "मंगलवार",   # Tuesday
    "बुधवार",    # Wednesday
    "गुरुवार",   # Thursday
    "शुक्रवार",  # Friday
    "शनिवार",    # Saturday
    "रविवार",    # Sunday
]

BLANK_ROWS = 16
EXTRA_LABELS = ["पानी", "कोल्ड ड्रिंक", "एक्स्ट्रा"]

CSS = """
@page { size: A4 portrait; margin: 9mm; }

* { box-sizing: border-box; }
body { margin: 0; font-family: 'Poppins', sans-serif; color: #000; font-size: 10pt; }

.sheet { page-break-after: always; }
.sheet:last-child { page-break-after: auto; }

.head { border: 1.4pt solid #000; border-bottom: 0; padding: 3mm 4mm 2.5mm; text-align: center; }
.hotel { font-size: 20pt; font-weight: 700; line-height: 1.25; }
.sheet-title { font-size: 12.5pt; font-weight: 700; margin-top: 2mm; padding-top: 1.5mm;
	border-top: 0.6pt solid #000; line-height: 1.4; }

.meta { width: 100%; border-collapse: collapse; border: 1.4pt solid #000; border-bottom: 0; }
.meta td { padding: 2.2mm 4mm; font-size: 10.5pt; font-weight: 700; border: 0; line-height: 1.5; }
.meta td.right { text-align: right; }

table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.grid th, table.grid td { border: 0.8pt solid #000; padding: 0; text-align: center; }
table.grid thead th { font-size: 11pt; font-weight: 700; height: 9mm; background: #e9e9e9;
	border-top-width: 1.4pt; border-bottom-width: 1.4pt; line-height: 1.5; }
table.grid tbody td { height: 8.5mm; }

.opening td { height: 8mm; background: #f4f4f4; }
.opening .label { font-size: 10.5pt; font-weight: 700; text-align: right; padding-right: 3mm; }

.extras td { height: 34mm; vertical-align: top; }
.extras .label { font-size: 10.5pt; font-weight: 700; text-align: left; padding: 2mm 3mm; line-height: 2.1; }

.total td { height: 10mm; font-size: 11.5pt; font-weight: 700; background: #e9e9e9;
	border-top-width: 1.4pt; border-bottom-width: 1.4pt; }
.total .label { text-align: right; padding-right: 3mm; }

.foot { border: 1.4pt solid #000; border-top: 0; }
.shree-box { border-bottom: 0.8pt solid #000; padding: 2.8mm 4mm; font-size: 11.5pt;
	font-weight: 700; line-height: 1.6; }
.shree-box .fill { display: inline-block; width: 140mm; border-bottom: 0.8pt solid #000; }

.comments { width: 100%; border-collapse: collapse; }
.comments td { border: 0; padding: 3mm 0 3.5mm; vertical-align: bottom; }
.comments td.label { width: 22mm; padding-left: 4mm; font-size: 10.5pt; font-weight: 700; }
.comments td.line { padding-right: 4mm; }
.comments .rule { border-bottom: 0.6pt solid #000; height: 6mm; }

.sign { width: 100%; border-collapse: collapse; }
.sign td { border: 0; padding: 0 4mm 3mm; font-size: 9.5pt; font-weight: 700; width: 50%; }
.sign .line { border-top: 0.8pt solid #000; padding-top: 1mm; text-align: center; width: 55mm; }
.sign td.r .line { margin-left: auto; }
"""


def sheet_html(day: date) -> str:
    weekday = HINDI_WEEKDAYS[day.weekday()]
    rows = "".join(
        "<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>"
        for _ in range(BLANK_ROWS)
    )
    labels = "".join(f"<div>{name}</div>" for name in EXTRA_LABELS)

    return f"""
<div class="sheet">
	<div class="head">
		<div class="hotel">होटल विवांता</div>
		<div class="sheet-title">दैनिक हिसाब एवं रूम शीट</div>
	</div>

	<table class="meta">
		<tr>
			<td>दिनांक : {day.strftime('%d/%m/%Y')}</td>
			<td class="right">वार : {weekday}</td>
		</tr>
	</table>

	<table class="grid">
		<thead>
			<tr>
				<th style="width: 16mm;">क्रमांक</th>
				<th style="width: 26mm;">कमरा नंबर</th>
				<th>UPI</th>
				<th>नकद</th>
				<th>आवक</th>
				<th>जावक</th>
			</tr>
		</thead>
		<tbody>
			<tr class="opening">
				<td colspan="4" class="label">ओपनिंग श्री (पिछला शेष)</td>
				<td></td><td></td>
			</tr>
			{rows}
			<tr class="extras">
				<td colspan="2" class="label">{labels}</td>
				<td colspan="4"></td>
			</tr>
			<tr class="total">
				<td colspan="2" class="label">कुल योग</td>
				<td></td><td></td><td></td><td></td>
			</tr>
		</tbody>
	</table>

	<div class="foot">
		<div class="shree-box">श्री : <span class="fill"></span></div>
		<table class="comments">
			<tr>
				<td class="label">टिप्पणी :</td>
				<td class="line"><div class="rule"></div></td>
			</tr>
		</table>
		<table class="sign">
			<tr>
				<td><div class="line">मैनेजर के हस्ताक्षर</div></td>
				<td class="r"><div class="line">मालिक के हस्ताक्षर</div></td>
			</tr>
		</table>
	</div>
</div>"""


def main() -> None:
    start = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date.today()
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 14

    pages = "".join(sheet_html(start + timedelta(days=i)) for i in range(days))
    doc = f"<!doctype html><html lang='hi'><head><meta charset='utf-8'>" \
          f"<style>{CSS}</style></head><body>{pages}</body></html>"

    end = start + timedelta(days=days - 1)
    out = Path(__file__).resolve().parent.parent / (
        f"daily-hisab-{start.strftime('%d-%m-%Y')}-to-{end.strftime('%d-%m-%Y')}.pdf"
    )
    HTML(string=doc).write_pdf(out)
    print(f"{days} pages -> {out}")


if __name__ == "__main__":
    main()
