import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / ".build" / "copilot" / "video"
OUT = BUILD / "captions"
OUT.mkdir(parents=True, exist_ok=True)
timeline = json.loads((BUILD / "timeline.json").read_text())
font_path = subprocess.check_output(["fc-match", "-f", "%{file}", "Nanum Gothic"], text=True).strip()
body_font = ImageFont.truetype(font_path, 37)
header_font = ImageFont.truetype(font_path, 28)
brand_font = ImageFont.truetype(font_path, 29)
small_font = ImageFont.truetype(font_path, 20)


def wrap(text, font, max_width):
    canvas = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = (line + " " + word).strip()
        if canvas.textlength(candidate, font=font) > max_width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


for scene in timeline:
    header = Image.new("RGBA", (1920, 76), (16, 21, 35, 250))
    draw = ImageDraw.Draw(header)
    draw.text((36, 23), "GitHub Copilot", font=brand_font, fill="#D7C3FF")
    draw.text((330, 24), scene["chapter"], font=header_font, fill="white")
    disclosure = "실제 CLI 녹화 · 구간 편집 · 시연용 자동 입력" if scene.get("terminal") else "실제 실행 편집 · 합성 데이터"
    width = draw.textlength(disclosure, font=small_font)
    draw.text((1883-width, 28), disclosure, font=small_font, fill="#B4BDCE")
    if 330 + draw.textlength(scene["chapter"], font=header_font) > 1860 - width:
        raise ValueError(f"Header text overlaps for {scene['id']}")
    header.save(OUT / f"{scene['id']}-header.png")
    for index, cue in enumerate(scene["captions"]):
        lines = wrap(cue["text"], body_font, 1770)
        if len(lines) > 2:
            raise ValueError(f"Caption exceeds two lines: {scene['id']} / {cue['text']}")
        image = Image.new("RGBA", (1920, 142), (16, 21, 35, 238))
        draw = ImageDraw.Draw(image)
        y = 34 if len(lines) == 2 else 51
        for line in lines:
            width = draw.textlength(line, font=body_font)
            draw.text(((1920-width)/2, y), line, font=body_font, fill="white")
            y += 48
        image.save(OUT / f"{scene['id']}-{index+1}.png")
print(f"Rendered {len(timeline)} headers and {sum(len(s['captions']) for s in timeline)} Korean caption overlays.")
