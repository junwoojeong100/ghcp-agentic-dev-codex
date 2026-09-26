import json
import re
import unicodedata
import sys
from pathlib import Path

import fitz

root = Path(__file__).resolve().parents[1]
revision = sys.argv[1] if len(sys.argv) > 1 else "cxo-v3"
if not re.fullmatch(r"[a-z0-9-]+", revision):
    raise ValueError("Invalid revision name")
rendered = root / ".build" / f"rendered-{revision}"
rendered.mkdir(parents=True, exist_ok=True)
slides = json.loads((root / f".build/presentation-{revision}/slides.json").read_text())
document = fitz.open(rendered / f"copilot-cxo-{revision}.pdf")
if len(document) != len(slides):
    raise ValueError("Rendered page count does not match the authored deck.")


def normalized(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFC", value))


report = []
for index, (slide, page) in enumerate(zip(slides, document), start=1):
    extracted = normalized(page.get_text())
    expected = [element["value"] for element in slide["elements"] if element["kind"] == "text"]
    expected.extend(cell for element in slide["elements"] if element["kind"] == "table" for row in element["rows"] for cell in row)
    missing = [value for value in expected if normalized(value) not in extracted]
    out_of_bounds = []
    for block in page.get_text("dict")["blocks"]:
        if "lines" not in block:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                x0, y0, x1, y1 = span["bbox"]
                if x0 < -1 or y0 < -1 or x1 > page.rect.width + 1 or y1 > page.rect.height + 1:
                    out_of_bounds.append(span["text"])
    page.get_pixmap(matrix=fitz.Matrix(1.3333, 1.3333), alpha=False).save(rendered / f"slide-{index}.png")
    report.append({"slide": index, "missing_native_text": missing, "text_outside_page": out_of_bounds, "rendered": True})
(rendered / "render-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
failures = [item for item in report if item["missing_native_text"] or item["text_outside_page"]]
if failures:
    raise ValueError(json.dumps(failures, ensure_ascii=False))
print(f"Rendered all {len(slides)} PPTX slides. Native text survived export and stayed within page bounds.")
