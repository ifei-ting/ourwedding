# -*- coding: utf-8 -*-
import os, datetime
from PIL import Image, ImageOps

SRC = r"C:\Users\tian\WorkBuddy\电子邀请函\婚纱照"
OUT = r"C:\Users\tian\WorkBuddy\电子邀请函\assets"
os.makedirs(OUT, exist_ok=True)

# name -> (src file, max width, quality)
plan = {
    "hero":      ("0C0A3418.jpg", 1900, 86),   # 空灵白调 新娘 窗边 → 封面
    "couple":    ("0C0A3513.jpg", 1400, 86),   # 正式灰底 合影(竖)
    "bride":     ("0C0A3443.jpg", 1300, 86),   # 新娘肖像
    "lily":      ("0C0A3387.jpg", 1400, 86),   # 百合特写 文艺
    "green":     ("0C0A4057.jpg", 1400, 86),   # 树荫暖阳
    "black":     ("0C0A3698.jpg", 1600, 86),   # 黑底高定合影
    "sunset":    ("0C0A4274.jpg", 1400, 86),   # 日落黑裙
    "path":      ("0C0A4045.jpg", 1400, 86),   # 绿径
    "arch":      ("0C0A3837.jpg", 1300, 86),   # 中式门廊
    "silhouette":("0C0A4252.jpg", 1600, 86),   # 日落剪影
    "studio":    ("0C0A3494.jpg", 1300, 86),   # 灰底合影2
    "window":    ("0C0A4216.jpg", 1300, 86),   # 窗边合影
}

for key, (fn, w, q) in plan.items():
    p = os.path.join(SRC, fn)
    im = Image.open(p)
    im = ImageOps.exif_transpose(im).convert("RGB")
    if im.width > w:
        h = round(im.height * w / im.width)
        im = im.resize((w, h), Image.LANCZOS)
    out = os.path.join(OUT, key + ".jpg")
    im.save(out, "JPEG", quality=q, optimize=True, progressive=True)
    print(key, fn, im.size, round(os.path.getsize(out)/1024), "KB")

# weekday
d = datetime.date(2026, 10, 25)
print("weekday:", d.strftime("%A"), "周", "一二三四五六日"[d.weekday()])
