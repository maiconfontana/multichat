#!/usr/bin/env python3
"""Gera o ícone de menu bar do macOS (template: preto + alpha).

Usa a silhueta de assets/icon.png, recorta pontinhos um pouco maiores
(para continuarem legíveis a ~18pt) e adiciona padding de menu bar.

Saída:
  assets/trayTemplate.png      22x22 @1x
  assets/trayTemplate@2x.png   44x44 @2x
"""
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"
LOGICAL = 22
PAD_RATIO = 0.10
# Centros dos "..." no PNG mestre 512px; raio maior que o original (~27px)
# para o furo sobreviver ao downscale.
DOT_CENTERS = ((175, 237), (255, 237), (335, 237))
DOT_RADIUS = 34


def bubble_mask(src: Image.Image) -> Image.Image:
	"""Alpha da bolha em preto; branco original (pontinhos) vira furo."""
	src = src.convert("RGBA")
	w, h = src.size
	mask = Image.new("L", (w, h), 0)
	px = src.load()
	mp = mask.load()
	for y in range(h):
		for x in range(w):
			r, g, b, a = px[x, y]
			if a < 8:
				continue
			if r > 180 and g > 180 and b > 180:
				continue
			mp[x, y] = a
	draw = ImageDraw.Draw(mask)
	for cx, cy in DOT_CENTERS:
		draw.ellipse(
			[cx - DOT_RADIUS, cy - DOT_RADIUS, cx + DOT_RADIUS, cy + DOT_RADIUS],
			fill=0,
		)
	return mask


def fit_template(mask: Image.Image, size: int) -> Image.Image:
	inner = max(1, int(round(size * (1 - 2 * PAD_RATIO))))
	alpha = mask.resize((inner, inner), Image.Resampling.LANCZOS)
	layer = Image.merge("RGBA", (
		Image.new("L", (inner, inner), 0),
		Image.new("L", (inner, inner), 0),
		Image.new("L", (inner, inner), 0),
		alpha,
	))
	canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
	off = (size - inner) // 2
	canvas.paste(layer, (off, off), layer)
	return canvas


def main() -> None:
	master = Image.open(ASSETS / "icon.png")
	mask = bubble_mask(master)
	for name, px in (("trayTemplate.png", LOGICAL), ("trayTemplate@2x.png", LOGICAL * 2)):
		img = fit_template(mask, px)
		dest = ASSETS / name
		img.save(dest, "PNG")
		print(f"wrote {dest} ({px}x{px})")


if __name__ == "__main__":
	main()
