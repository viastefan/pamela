# Erzeugt alle Logo-Dateien aus dem Zeichen (durchsichtiges PNG). Aufruf: python3 scripts/logo.py <zeichen.png>
import sys
from PIL import Image, ImageDraw
src = Image.open(sys.argv[1]).convert('RGBA')
# Reste vom Freistellen entfernen: fast durchsichtige Punkte ganz weg
a = src.getchannel('A').point(lambda v: 0 if v < 48 else v); src.putalpha(a)
src = src.crop(a.getbbox())
def square(size, pad, bg=None, radius=0):
    inner = round(size * (1 - 2 * pad)); m = src.copy(); m.thumbnail((inner, inner), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    if bg:
        tile = Image.new('RGBA', (size * 4, size * 4), (0, 0, 0, 0))
        ImageDraw.Draw(tile).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=round(size * 4 * radius), fill=bg)
        out = tile.resize((size, size), Image.LANCZOS)
    out.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2)); return out
CREAM = (248, 244, 239, 255)
for s in (96, 192, 512): square(s, .02).save(f'public/img/logo-{s}.webp', quality=92, method=6)
square(512, .17, CREAM, .225).save('public/img/icon-512.png', optimize=True)
square(48, .12, CREAM, .225).save('public/favicon.png', optimize=True)
square(64, .12, CREAM, .225).save('public/favicon.ico', sizes=[(32, 32), (16, 16)])
square(180, .16, CREAM, 0).convert('RGB').save('public/apple-touch-icon.png', optimize=True)

