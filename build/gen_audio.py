# -*- coding: utf-8 -*-
"""
生成小程序用的背景音乐（纯 Python，不依赖任何库/外网素材）
柔和钢琴式琶音 + 慢混响，Dmaj7-Bm7-Gmaj7-A 四小节，10 秒无缝循环
"""
import math, wave, struct, os

SR = 22050
DUR = 10.0
N = int(SR * DUR)
OUT = r"C:\Users\tian\WorkBuddy\电子邀请函\miniprogram\audio"
os.makedirs(OUT, exist_ok=True)

# 四小节，每节 2.5 秒
CHORDS = [
    [146.83, 220.00, 277.18, 329.63],  # Dmaj7
    [123.47, 185.00, 220.00, 293.66],  # Bm7
    [ 98.00, 146.83, 185.00, 246.94],  # Gmaj7
    [110.00, 164.81, 220.00, 277.18],  # A
]
BAR = DUR / len(CHORDS)

buf = [0.0] * N

def add(idx, val):
    if 0 <= idx < N:
        buf[idx] += val

# 琶音：每小节 4 个音，音色 = 基频 + 少量二次谐波，快速起音 + 长衰减
PATTERN = [0, 1, 2, 3]
for b, chord in enumerate(CHORDS):
    t0 = b * BAR
    for k, note_i in enumerate(PATTERN):
        f = chord[note_i] * (2 if k == 2 else 1)
        start = t0 + k * (BAR / 4.6)
        dur = 3.2
        amp = 0.20
        i0 = int(start * SR)
        n = int(dur * SR)
        for j in range(n):
            t = j / SR
            env = (1 - math.exp(-t * 55)) * math.exp(-t * 1.35)     # 起音快、衰减慢
            s = (math.sin(2*math.pi*f*t) * 0.72
                 + math.sin(2*math.pi*f*2*t) * 0.16
                 + math.sin(2*math.pi*f*3*t) * 0.06)
            add(i0 + j, s * env * amp)

# 低音铺底
for b, chord in enumerate(CHORDS):
    f = chord[0] / 2
    i0 = int(b * BAR * SR)
    n = int(BAR * SR)
    for j in range(n):
        t = j / SR
        env = min(1.0, t * 2.2) * min(1.0, (BAR - t) * 2.2)     # 两端淡入淡出，接缝干净
        add(i0 + j, math.sin(2*math.pi*f*t) * env * 0.085)

# 简易混响（梳状延迟 + 反馈），让声音柔一点
for delay_s, gain in ((0.11, 0.34), (0.19, 0.26), (0.29, 0.19)):
    d = int(delay_s * SR)
    for i in range(d, N):
        buf[i] += buf[i - d] * gain

# 整体淡入淡出，循环处无缝
fade = int(0.35 * SR)
for i in range(fade):
    buf[i] *= i / fade
    buf[N - 1 - i] *= i / fade

peak = max(abs(x) for x in buf) or 1.0
scale = 0.72 / peak      # 留足余量，音量偏低不吵人

path = os.path.join(OUT, "bgm.wav")
with wave.open(path, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b"".join(
        struct.pack("<h", int(max(-1, min(1, x * scale)) * 32767)) for x in buf
    ))

print(f"{path}  {os.path.getsize(path)/1024:.0f} KB  {SR}Hz 单声道 {DUR}s")
