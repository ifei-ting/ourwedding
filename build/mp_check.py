# -*- coding: utf-8 -*-
"""小程序工程自检"""
import json, os, re, glob

MP = r"C:\Users\tian\WorkBuddy\电子邀请函\miniprogram"
ok = True

def bad(msg):
    global ok
    ok = False
    print("  [X]", msg)

print("=== 1. JSON 合法性 ===")
for p in glob.glob(os.path.join(MP, "**", "*.json"), recursive=True):
    try:
        json.load(open(p, encoding="utf-8"))
        print("  [OK]", os.path.relpath(p, MP))
    except Exception as e:
        bad(f"{os.path.relpath(p, MP)} -> {e}")

print("\n=== 2. app.json 页面声明 vs 实际文件 ===")
app = json.load(open(os.path.join(MP, "app.json"), encoding="utf-8"))
for pg in app["pages"]:
    for ext in ("js", "json", "wxml", "wxss"):
        f = os.path.join(MP, pg + "." + ext)
        print(("  [OK] " if os.path.exists(f) else "  [X] ") + pg + "." + ext)
        if not os.path.exists(f):
            bad("缺少 " + pg + "." + ext)

print("\n=== 3. 引用的图片是否都存在 ===")
refs = set()
for p in glob.glob(os.path.join(MP, "**", "*"), recursive=True):
    if p.endswith((".wxml", ".js", ".wxss")):
        txt = open(p, encoding="utf-8").read()
        refs |= set(re.findall(r"['\"](/(?:images|audio)/[^'\"]+)['\"]", txt))
        refs |= set(re.findall(r"['\"]((?:images|audio)/[^'\"]+)['\"]", txt))
for r in sorted(refs):
    f = os.path.join(MP, r.lstrip("/").replace("/", os.sep))
    print(("  [OK] " if os.path.exists(f) else "  [X] ") + r)
    if not os.path.exists(f):
        bad("图片/音频缺失: " + r)

unused = []
for f in sorted(glob.glob(os.path.join(MP, "images", "*.jpg"))):
    rel = "/" + os.path.relpath(f, MP).replace(os.sep, "/")
    if rel not in refs:
        unused.append(rel)
if unused:
    print("  [!] 未被引用（可删）:", ", ".join(unused))

print("\n=== 4. WXSS 是否残留不可靠选择器 ===")
wxss = open(os.path.join(MP, "pages", "index", "index.wxss"), encoding="utf-8").read()
# ::before / ::after 是 WXSS 官方支持的伪元素，先剔除再检查伪类
cleaned = re.sub(r"::(before|after)", "", wxss)
problems = 0
for pat, label in ((r"(?<!:):[a-z-]+\b", "伪类 :xxx"), (r"\s>\s", "子选择器 >"), (r"\[\w+", "属性选择器")):
    hits = set(re.findall(pat, cleaned))
    if hits:
        problems += 1
        bad(f"发现 {label}: {hits}")
if not problems:
    print("  [OK] 未发现不可靠的伪类 / 子选择器 / 属性选择器（::before、::after 已放行）")

print("\n=== 5. WXML 标签闭合 ===")
wxml = open(os.path.join(MP, "pages", "index", "index.wxml"), encoding="utf-8").read()
wxml_nc = re.sub(r"<!--[\s\S]*?-->", "", wxml)
stack, errs = [], []
for m in re.finditer(r"<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>", wxml_nc):
    closing, tag, attrs, self_close = m.group(1), m.group(2), m.group(3), m.group(4)
    if self_close:
        continue
    if closing:
        if not stack or stack[-1] != tag:
            errs.append(f"</{tag}> 不匹配（栈顶 {stack[-1] if stack else '空'}）")
        else:
            stack.pop()
    else:
        stack.append(tag)
if stack or errs:
    bad(f"未闭合: {stack} / 错误: {errs}")
else:
    print("  [OK] 标签全部正确闭合")

print("\n=== 6. 包体积 ===")
total = 0
for root, dirs, files in os.walk(MP):
    dirs[:] = [d for d in dirs if d not in ("node_modules", ".git")]
    for f in files:
        if f in ("project.private.config.json",):
            continue
        total += os.path.getsize(os.path.join(root, f))
print(f"  合计 {total/1024/1024:.2f} MB  （主包上限 2.00 MB）")
if total / 1024 / 1024 > 2:
    bad("超过主包上限！需要压缩图片或改用云存储")

print("\n" + ("全部通过 ✅" if ok else "存在问题 ❌"))
