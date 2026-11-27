import numpy as np, subprocess, math, functools, wave, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

W, H, FPS, SR = 1080, 1920, 30, 44100
# Manba kadrlar: <SRC>/<nom>/%04d.jpg (1080x1920); natija: <OUT>/<nom>.mp4 — README.md ga qarang
SRC = os.environ.get('VIDEO_SRC', '/home/claude/sty/src')
OUT = os.environ.get('VIDEO_OUT', '/home/claude/sty/out')
FD = os.environ.get('VIDEO_FONTS', '/usr/share/fonts/opentype/inter/')
BLUE = (38, 99, 235); ORANGE = (255, 122, 26); WHITE = (255, 255, 255); INK = (17, 20, 28)

def font(w, s): return ImageFont.truetype(FD + {'black': 'InterDisplay-Black.otf', 'bold': 'InterDisplay-Bold.otf',
    'semi': 'InterDisplay-SemiBold.otf', 'light': 'InterDisplay-Light.otf', 'thin': 'InterDisplay-Thin.otf', 'reg': 'InterDisplay-Regular.otf'}[w], s)

NFR = {n: len(os.listdir(f'{SRC}/{n}')) for n in os.listdir(SRC)}

@functools.lru_cache(maxsize=64)
def frame(n, i):
    i = max(1, min(NFR[n], int(i)))
    return Image.open(f'{SRC}/{n}/{i:04d}.jpg').convert('RGB')

def clip(n, t, t0, speed=1.0, start=1):
    return frame(n, start + (t - t0) * FPS * speed)

def zoom(im, s, cx=0.5, cy=0.5, dx=0, dy=0):
    if s == 1 and dx == 0 and dy == 0: return im
    w, h = W / s, H / s
    x0 = cx * W - w / 2 + dx; y0 = cy * H - h / 2 + dy
    x0 = max(0, min(W - w, x0)); y0 = max(0, min(H - h, y0))
    return im.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + w, y0 + h))

# easings
def clamp(x, a=0, b=1): return max(a, min(b, x))
def ramp(t, a, b): return clamp((t - a) / (b - a)) if b > a else float(t >= a)
def eo(x): return 1 - (1 - x) ** 3
def eio(x): return 3 * x * x - 2 * x * x * x
def back(x, k=1.9): x -= 1; return 1 + (k + 1) * x ** 3 + k * x ** 2

def darken(im, a): return Image.blend(im, Image.new('RGB', im.size, (0, 0, 0)), a) if a > 0 else im
def flash(im, a, col=WHITE): return Image.blend(im, Image.new('RGB', im.size, col), clamp(a)) if a > 0 else im

@functools.lru_cache(maxsize=4)
def vignette(strength=0.55):
    y, x = np.mgrid[0:H, 0:W]
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
    return (1 - strength * clamp_arr(d - 0.35, 0, 1) ** 1.6)[..., None]

def clamp_arr(a, lo, hi): return np.clip(a, lo, hi)

def grade_cine(im, t):
    a = np.asarray(im).astype(np.float32) / 255
    a = a ** 1.08  # a bit more contrast in mids
    # teal shadows / warm highlights
    lum = a.mean(axis=2, keepdims=True)
    warm = np.array([1.06, 1.0, 0.86]); teal = np.array([0.86, 0.98, 1.06])
    a = a * (lum * warm + (1 - lum) * teal)
    a = a * vignette(0.6)
    rng = np.random.default_rng(int(t * 1000))
    a = a + rng.normal(0, 0.018, (H // 2, W // 2, 1)).repeat(2, 0).repeat(2, 1)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

def rgb_split(im, px):
    if px <= 0: return im
    r, g, b = im.split()
    r = r.transform(im.size, Image.AFFINE, (1, 0, px, 0, 1, 0)); b = b.transform(im.size, Image.AFFINE, (1, 0, -px, 0, 1, 0))
    return Image.merge('RGB', (r, g, b))

def light_leak(im, t, x, a):
    if a <= 0: return im
    lay = Image.new('RGB', (W // 4, H // 4), (0, 0, 0)); d = ImageDraw.Draw(lay)
    cx = x * W / 4
    for r, c in [(260, (255, 140, 40)), (160, (255, 190, 90)), (80, (255, 230, 170))]:
        d.ellipse((cx - r / 4 * 1.0, -r / 3, cx + r / 4 * 1.0, H / 4 * 0.55), fill=c)
    lay = lay.filter(ImageFilter.GaussianBlur(40)).resize((W, H))
    return Image.fromarray(np.clip(np.asarray(im).astype(np.int16) + (np.asarray(lay) * a).astype(np.int16), 0, 255).astype(np.uint8))

@functools.lru_cache(maxsize=256)
def text_img(s, w, size, col=WHITE, track=0, stroke=0, scol=(0, 0, 0)):
    f = font(w, size)
    if track == 0:
        bb = f.getbbox(s, stroke_width=stroke)
        im = Image.new('RGBA', (bb[2] - bb[0] + 4, bb[3] - bb[1] + 4), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((-bb[0] + 2, -bb[1] + 2), s, font=f, fill=col, stroke_width=stroke, stroke_fill=scol)
        return im
    widths = [f.getlength(c) + track for c in s]; tw = int(sum(widths) - track) + 4
    asc, desc = f.getmetrics(); im = Image.new('RGBA', (max(tw, 4), asc + desc + 4), (0, 0, 0, 0)); d = ImageDraw.Draw(im); x = 2
    for c, wd in zip(s, widths): d.text((x, 2), c, font=f, fill=col); x += wd
    return im

def put(base, ov, x, y, scale=1.0, alpha=1.0, anchor='c', rot=0):
    if alpha <= 0.01 or scale <= 0.01: return base
    if scale != 1: ov = ov.resize((max(1, int(ov.width * scale)), max(1, int(ov.height * scale))), Image.BICUBIC)
    if rot: ov = ov.rotate(rot, expand=True, resample=Image.BICUBIC)
    if alpha < 1:
        a = ov.split()[3].point(lambda v: int(v * alpha)); ov = ov.copy(); ov.putalpha(a)
    if anchor == 'c': x, y = x - ov.width // 2, y - ov.height // 2
    elif anchor == 'l': y = y - ov.height // 2
    base.paste(ov, (int(x), int(y)), ov); return base

def rrect(w, h, r, fill, outline=None, width=0):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ImageDraw.Draw(im).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=fill, outline=outline, width=width); return im

def pill(s, w='bold', size=46, bg=BLUE, fg=WHITE, padx=36, pady=18):
    t = text_img(s, w, size, fg); im = rrect(t.width + 2 * padx, t.height + 2 * pady, (t.height + 2 * pady) // 2, bg)
    im.paste(t, (padx, pady), t); return im

def shadowed(ov, blur=18, off=10, a=110):
    sh = Image.new('RGBA', (ov.width + 80, ov.height + 80), (0, 0, 0, 0))
    m = ov.split()[3].point(lambda v: int(v * a / 255)); blk = Image.new('RGBA', ov.size, (0, 0, 0, 255)); blk.putalpha(m)
    sh.paste(blk, (40, 40 + off), blk); sh = sh.filter(ImageFilter.GaussianBlur(blur)); sh.paste(ov, (40, 40), ov); return sh

def logo_card(t, t0, bg=WHITE):
    im = Image.new('RGB', (W, H), bg); k = t - t0
    s1 = back(ramp(k, 0, 0.35)); put(im, text_img('ARCHEMISTRY', 'black', 120, INK), W // 2, 860, 0.6 + 0.4 * s1, ramp(k, 0, 0.15))
    s2 = back(ramp(k, 0.12, 0.45)); put(im, text_img('LAB', 'black', 120, BLUE, track=30), W // 2, 990, 0.6 + 0.4 * s2, ramp(k, 0.12, 0.25))
    s3 = back(ramp(k, 0.35, 0.7)); put(im, pill('archemistry.uz', 'bold', 54), W // 2, 1180, s3, ramp(k, 0.35, 0.45))
    return im

# ---------- audio ----------
def env(n, a, d):
    e = np.ones(n); na = int(a * SR); e[:na] = np.linspace(0, 1, na) if na else 1; e *= np.exp(-np.arange(n) / (d * SR)); return e

def kick(v=1):
    n = int(0.35 * SR); t = np.arange(n) / SR; f = 45 + 110 * np.exp(-t * 28)
    return v * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def hat(v=0.25):
    n = int(0.06 * SR); x = np.random.randn(n); x = np.diff(np.r_[0, x]); return v * x * np.exp(-np.arange(n) / (0.012 * SR))

def snare(v=0.5):
    n = int(0.25 * SR); t = np.arange(n) / SR; x = np.random.randn(n) * np.exp(-t * 18) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)
    return v * x

def whoosh(dur=0.45, v=0.5, rise=True):
    n = int(dur * SR); x = np.random.randn(n); out = np.zeros(n); y = 0
    for i in range(n):
        k = i / n if rise else 1 - i / n; a = 0.02 + 0.5 * k ** 2; y += a * (x[i] - y); out[i] = y
    e = np.sin(np.pi * np.arange(n) / n) ** 1.5; return v * out * e * 3

def boom(v=1):
    n = int(1.2 * SR); t = np.arange(n) / SR
    return v * (np.sin(2 * np.pi * (38 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 2.5) + 0.3 * np.random.randn(n) * np.exp(-t * 12))

def pop(v=0.35, f=880):
    n = int(0.12 * SR); t = np.arange(n) / SR; return v * np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t * 40))) * np.exp(-t * 35)

def tick(v=0.18):
    n = int(0.02 * SR); return v * np.random.randn(n) * np.exp(-np.arange(n) / (0.003 * SR))

def pad(dur, freqs, v=0.12, att=1.5):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f in freqs:
        for det in (-0.4, 0.4): x += np.sin(2 * np.pi * (f + det) * t + np.sin(2 * np.pi * 0.2 * t))
    e = np.minimum(1, t / att) * np.minimum(1, (dur - t) / 1.2); return v * x / len(freqs) * e

def bass(dur, f, v=0.25):
    n = int(dur * SR); t = np.arange(n) / SR; return v * np.tanh(2 * np.sin(2 * np.pi * f * t)) * np.exp(-t * 3)

def pluck(f, v=0.22, d=0.5):
    n = int(d * SR); t = np.arange(n) / SR; return v * (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 7)

def riser(dur, v=0.3):
    n = int(dur * SR); t = np.arange(n) / SR; f = 200 * (8 ** (t / dur))
    return v * (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + whoosh(dur, 1)[:n] * 0.5) * (t / dur) ** 2

class Mix:
    def __init__(s, dur): s.b = np.zeros(int(dur * SR) + SR)
    def add(s, x, at):
        i = int(at * SR); j = min(len(s.b), i + len(x)); s.b[i:j] += x[:j - i]
    def write(s, path, dur):
        x = s.b[:int(dur * SR)]
        # simple delay "reverb"
        y = x.copy()
        for dl, g in [(0.083, 0.25), (0.131, 0.18), (0.197, 0.12)]:
            k = int(dl * SR); y[k:] += x[:-k] * g
        y = y / (np.abs(y).max() + 1e-9) * 0.89
        st = (np.stack([y, y], 1) * 32767).astype(np.int16)
        with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())

def render(name, dur, fn, mix):
    out = f'{OUT}/{name}'; os.makedirs(OUT, exist_ok=True)
    mix.write(out + '.wav', dur)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-i', out + '.wav', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
                          '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out + '.mp4'], stdin=subprocess.PIPE)
    for i in range(int(dur * FPS)):
        im = fn(i / FPS); p.stdin.write(im.convert('RGB').tobytes())
    p.stdin.close(); p.wait(); print('done', out + '.mp4')

@functools.lru_cache(maxsize=8)
def _grad(y0, y1, a):
    g = np.zeros((H, 1), np.float32)
    if y1 > y0: g[y0:y1, 0] = np.linspace(0, a, y1 - y0); g[y1:, 0] = a
    else: g[y1:y0, 0] = np.linspace(a, 0, y0 - y1); g[:y1, 0] = a
    return g[..., None]

def grad(im, y0, y1, a=0.65):
    arr = np.asarray(im).astype(np.float32) * (1 - _grad(y0, y1, a)); return Image.fromarray(arr.astype(np.uint8))
