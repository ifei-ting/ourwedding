# -*- coding: utf-8 -*-
import os, math
from PIL import Image, ImageDraw, ImageFont

SRC = r"C:\Users\tian\WorkBuddy\电子邀请函\婚纱照"
OUT = r"C:\Users\tian\WorkBuddy\电子邀请函\build"

files = sorted([f for f in os.listdir(SRC) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
print("count", len(files))

cols = 6
cell_w, cell_h = 300, 380
pad = 8
rows = math.ceil(len(files) / cols)
sheet = Image.new("RGB", (cols * (cell_w + pad) + pad, rows * (cell_h + pad) + pad), "white")
draw = ImageDraw.Draw(sheet)

try:
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
except Exception:
    font = ImageFont.load_default()

for i, f in enumerate(files):
    p = os.path.join(SRC, f)
    im = Image.open(p)
    im = im.convert("RGB")
    # fix orientation with exif
    try:
        from PIL import ImageOps
        im = ImageOps.exif_transpose(im)
    except Exception:
        pass
    im.thumbnail((cell_w, cell_h - 30))
    r, c = divmod(i, cols)
    x = pad + c * (cell_w + pad)
    y = pad + r * (cell_h + pad)
    # center
    ox = x + (cell_w - im.width) // 2
    oy = y + (cell_h - 30 - im.height) // 2
    sheet.paste(im, (ox, oy))
    draw.text((x + 4, y + cell_h - 26), f, fill="black", font=font)

sheet.save(os.path.join(OUT, "contact_sheet.jpg"), quality=80)
print("saved", sheet.size)

# also individual small thumbs for detail viewing
TD = os.path.join(OUT, "thumb")
os.makedirs(TD, exist_ok=True)
for f in files:
    im = Image.open(os.path.join(SRC, f)).convert("RGB")
    try:
        from PIL import ImageOps
        im = ImageOps.exif_transpose(im)
    except Exception:
        pass
    im.thumbnail((900, 900))
    im.save(os.path.join(TD, f), quality=82)
print("thumbs done")
