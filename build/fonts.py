# -*- coding: utf-8 -*-
"""
把邀请函用到的字符抽出来 → 向 Google Fonts 请求精确子集 → 下载 woff2 到本地 assets/fonts/
结果：不依赖外网、离线可用，且体积很小。
"""
import os, re, html, urllib.parse, urllib.request

ROOT = r"C:\Users\tian\WorkBuddy\电子邀请函"
HTML = os.path.join(ROOT, "index.html")
FDIR = os.path.join(ROOT, "assets", "fonts")
os.makedirs(FDIR, exist_ok=True)

src = open(HTML, encoding="utf-8").read()

# 1. 去掉 style/script，剥标签，取可见文本
t = re.sub(r"<style[\s\S]*?</style>", " ", src, flags=re.I)
t = re.sub(r"<script[\s\S]*?</script>", " ", t, flags=re.I)
t = re.sub(r"<!--[\s\S]*?-->", " ", t)
t = re.sub(r"<[^>]+>", " ", t)
t = html.unescape(t)
chars = sorted({c for c in t if not c.isspace()})

# 补上交互文案里可能出现的字符，留一点余量
chars += list("0123456789．.,·—－（）()&＆/·:：")
chars = sorted(set(chars))
text = "".join(chars)
print("字符数:", len(chars))
print(text)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

FAMILIES = {
    "Noto Serif SC":     "family=Noto+Serif+SC:wght@300;400",
    "Noto Sans SC":      "family=Noto+Sans+SC:wght@300;400",
    "Cormorant Garamond":"family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400",
}

enc = urllib.parse.quote(text, safe="")
faces = []          # (fam, style, weight, url)
for fam, q in FAMILIES.items():
    url = f"https://fonts.googleapis.com/css2?{q}&text={enc}&display=swap"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=25).read().decode("utf-8")
    for block in re.findall(r"@font-face\s*\{[^}]*\}", css):
        style = re.search(r"font-style:\s*(\w+)", block)
        weight = re.search(r"font-weight:\s*(\d+)", block)
        u = re.search(r"url\((https://[^)]+)\)", block)
        if not (u and weight):
            continue
        faces.append((fam, style.group(1) if style else "normal", weight.group(1), u.group(1)))

# 同一个 URL 只下一个文件（Noto 系列可能是可变字体，多字重共用一个文件）
by_url, manifest = {}, []
for fam, style, weight, u in faces:
    if u not in by_url:
        slug = fam.lower().replace(" ", "-")
        tag = "italic" if style == "italic" else "normal"
        name = f"{slug}-{tag}.woff2"
        try:
            data = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}),
                                          timeout=30).read()
            open(os.path.join(FDIR, name), "wb").write(data)
            by_url[u] = name
            print(f"  {fam:20s} {tag:7s}  ->  {name:42s} {len(data)/1024:7.1f} KB")
        except Exception as e:
            print("  下载失败", fam, style, weight, e)
            continue
    manifest.append((fam, style, weight, by_url[u]))
