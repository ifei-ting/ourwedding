# -*- coding: utf-8 -*-
"""小程序专用图片：更小尺寸，保证主包 < 2MB"""
import os
from PIL import Image, ImageOps

SRC = r"C:\Users\tian\WorkBuddy\电子邀请函\婚纱照"
OUT = r"C:\Users\tian\WorkBuddy\电子邀请函\miniprogram\images"
os.makedirs(OUT, exist_ok=True)

# 名字 -> (源文件, 最大宽度, 质量)
plan = [
    ("hero",       "0C0A3418.jpg", 1200, 78),
    ("bride",      "0C0A3443.jpg",  900, 78),
    ("couple",     "0C0A3513.jpg",  900, 78),
    ("green",      "0C0A4057.jpg",  900, 78),
    ("lily",       "0C0A3387.jpg",  900, 78),
    ("black",      "0C0A3698.jpg", 1200, 78),
    ("sunset",     "0C0A4274.jpg",  900, 78),
    ("path",       "0C0A4045.jpg",  900, 78),
    ("arch",       "0C0A3837.jpg",  900, 78),
    ("studio",     "0C0A3494.jpg",  900, 78),
    ("silhouette", "0C0A4252.jpg", 1200, 78),
]

total = 0
for key, fn, w, q in plan:
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, fn))).convert("RGB")
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    out = os.path.join(OUT, key + ".jpg")
    im.save(out, "JPEG", quality=q, optimize=True, progressive=True)
    sz = os.path.getsize(out)
    total += sz
    print(f"{key:12s} {im.size[0]:>4}x{im.size[1]:<4}  {sz/1024:6.1f} KB")
print(f"\n图片合计 {total/1024:.1f} KB  =  {total/1024/1024:.2f} MB")
print("主包上限 2.00 MB ——", "✅ 可以放下" if total/1024/1024 < 1.6 else "⚠️ 偏大，需要再压")
