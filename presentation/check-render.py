import json
import re
import unicodedata
from pathlib import Path

import fitz

root = Path(__file__).resolve().parents[1]
slides = json.loads((root / ".build/presentation-v2/slides.json").read_text())
document = fitz.open(root / ".build/rendered/copilot-cxo-v2.pdf")
if len(document) != len(slides):
    raise ValueError("Rendered page count does not match the authored deck.")


def normalized(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFC", value))


report = []
for index, (slide, page) in enumerate(zip(slides, document), start=1):
    extracted = normalized(page.get_text())
    expected = [element["value"] for element in slide["elements"] if element["kind"] == "text"]
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
    page.get_pixmap(matrix=fitz.Matrix(1.3333, 1.3333), alpha=False).save(root / f".build/rendered/slide-{index}.png")
    report.append({"slide": index, "missing_native_text": missing, "text_outside_page": out_of_bounds, "rendered": True})
(root / ".build/rendered/render-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
failures = [item for item in report if item["missing_native_text"] or item["text_outside_page"]]
if failures:
    raise ValueError(json.dumps(failures, ensure_ascii=False))
print(f"Rendered all {len(slides)} PPTX slides. Native text survived export and stayed within page bounds.")
