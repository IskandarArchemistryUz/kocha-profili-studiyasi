from fx import *
DUR = 8.4
B = 60 / 112

def step_chip(n, label, k):
    c = rrect(84, 84, 42, BLUE); ImageDraw.Draw(c).text((42, 40), str(n), font=font('black', 50), fill=WHITE, anchor='mm')
    t = text_img(label, 'bold', 50, INK); w = 84 + 24 + t.width + 40
    im = rrect(w, 120, 60, (255, 255, 255, 240)); im.paste(c, (18, 18), c); im.paste(t, (84 + 40, 60 - t.height // 2), t)
    return shadowed(im, 16, 6, 90)

def arc_overlay(cx, cy, rx, ry, frac, col=ORANGE, width=10):
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    if frac > 0: d.arc((cx - rx, cy - ry, cx + rx, cy + ry), -90, -90 + 360 * frac, fill=col, width=width)
    return ov

def arrow(d, p0, p1, frac, col=ORANGE, w=10):
    x = p0[0] + (p1[0] - p0[0]) * frac; y = p0[1] + (p1[1] - p0[1]) * frac
    d.line((p0[0], p0[1], x, y), fill=col, width=w)
    if frac > 0.95:
        ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
        for s in (-1, 1): d.line((x, y, x - 40 * math.cos(ang + s * 0.5), y - 40 * math.sin(ang + s * 0.5)), fill=col, width=w)

def bar_card(rows, k):
    w, h = 900, 120 + 130 * len(rows); im = rrect(w, h, 40, (255, 255, 255, 245)); d = ImageDraw.Draw(im)
    d.text((50, 40), 'RESULT', font=font('black', 40), fill=BLUE)
    for i, (lab, val, frac, unit) in enumerate(rows):
        kk = eo(clamp((k - 0.15 * i) / 0.8)); y = 120 + 130 * i
        d.text((50, y), lab, font=font('semi', 40), fill=(90, 96, 110))
        v = val * kk; d.text((w - 50, y), (f'{v:,.0f}' if val > 20 else f'{v:.2f}') + unit, font=font('black', 46), fill=INK, anchor='ra')
        d.rounded_rectangle((50, y + 62, w - 50, y + 80), 9, fill=(230, 234, 242))
        d.rounded_rectangle((50, y + 62, 50 + max(18, (w - 100) * frac * kk), y + 80), 9, fill=BLUE)
    return shadowed(im, 20, 8, 100)

S1, S2, S3, S4 = 0, 2.6, 4.6, 6.4
def F(t):
    if t < S2:  # step 1 – site, annotate
        im = zoom(frame('gen', 1), 1.25, cx=0.5, cy=0.5)
        ov = arc_overlay(560, 980, 330, 230, eo(ramp(t, 0.5, 1.3)))
        im = im.convert('RGBA'); im.alpha_composite(ov); im = im.convert('RGB')
        d = ImageDraw.Draw(im); arrow(d, (840, 560), (700, 760), eo(ramp(t, 1.2, 1.6)))
        put(im, pill('7.26 ha site', 'black', 52, ORANGE), 860, 500, back(ramp(t, 1.5, 1.9)), ramp(t, 1.5, 1.6))
        put(im, step_chip(1, 'Pick the site', 0), W // 2, 260, back(ramp(t, 0.1, 0.5)), ramp(t, 0.1, 0.2))
    elif t < S3:  # before / after wipe
        k = t - S2; before = zoom(frame('gen', 1), 1.25); after = zoom(frame('gen', NFR['gen']), 1.25)
        x = int(W * eio(ramp(k, 0.3, 1.5)))
        im = before.copy(); im.paste(after.crop((0, 0, x, H)), (0, 0))
        d = ImageDraw.Draw(im); d.rectangle((x - 4, 0, x + 4, H), fill=WHITE)
        put(im, rrect(70, 70, 35, WHITE), x, H // 2, 1, 1 if 0 < x < W else 0)
        put(im, pill('BEFORE', 'black', 44, (40, 44, 56)), 200, 1700, 1, 1 if x < 380 else 0)
        put(im, pill('AFTER', 'black', 44, BLUE), 180, 1700, 1, ramp(k, 0.9, 1.1))
        put(im, step_chip(2, 'Generate the plan', 0), W // 2, 260, back(ramp(k, 0, 0.35)), 1)
    elif t < S4:  # split screen
        k = t - S3; im = Image.new('RGB', (W, H), WHITE)
        top = zoom(clip('orbit', t, S3, 1.5, 120), 1.0).resize((W, H)).crop((0, H // 4, W, H // 4 + H // 2))
        bot = clip('sun', t, S3, 2.0, 1).crop((0, H // 4, W, H // 4 + H // 2))
        sl = int(W * (1 - eo(ramp(k, 0, 0.4))))
        im.paste(top, (-sl, 0)); im.paste(bot, (sl, H // 2))
        ImageDraw.Draw(im).rectangle((0, H // 2 - 4, W, H // 2 + 4), fill=WHITE)
        put(im, pill('3D massing', 'bold', 46, INK), 60, 120, 1, ramp(k, 0.3, 0.45), anchor='l')
        put(im, pill('Sun & shadow', 'bold', 46, ORANGE), 60, H // 2 + 120, 1, ramp(k, 0.5, 0.65), anchor='l')
        put(im, step_chip(3, 'Test it', 0), W // 2, H // 2, back(ramp(k, 0.6, 0.95)), ramp(k, 0.6, 0.7))
    else:  # result card
        k = t - S4; bg = zoom(clip('orbit', t, S4, 0.8, 250), 1.1).filter(ImageFilter.GaussianBlur(6)); im = darken(bg, 0.35)
        rows = [('Site area', 7.26, 0.55, ' ha'), ('Floor area', 90477, 0.9, ' m²'), ('Residents', 1936, 0.7, '')]
        put(im, bar_card(rows, k * 1.3), W // 2, 900, 0.9 + 0.1 * back(ramp(k, 0, 0.35)), ramp(k, 0, 0.15))
        put(im, pill('archemistry.uz', 'bold', 54), W // 2, 1500, back(ramp(k, 0.9, 1.3)), ramp(k, 0.9, 1.0))
    for c in (S2, S3, S4):
        if 0 <= t - c < 0.08: im = flash(im, 0.5 * (1 - (t - c) / 0.08))
    return im

m = Mix(DUR)
notes = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 988, 784, 659, 587, 523]
for i in range(int(DUR / B)):
    m.add(pluck(notes[i % len(notes)], 0.16, 0.4), i * B); m.add(kick(0.35), i * B) if i % 2 == 0 else m.add(hat(0.15), i * B)
for i in range(int(DUR / B / 2)): m.add(bass(2 * B, [65.4, 49, 55, 43.6][i % 4], 0.18), i * 2 * B)
for a in (0.1, 1.5, S2, S3 + 0.6, S4 + 0.9): m.add(pop(0.4, 990), a)
for c in (S2, S3, S4): m.add(whoosh(0.3, 0.4), c - 0.25)
m.add(whoosh(1.2, 0.35, rise=False), S2 + 0.3)
for j in range(10): m.add(tick(0.15), S4 + 0.1 + j * 0.09)
render('C_explainer', DUR, F, m)
