from fx import *
B = 60 / 128; DUR = 16 * B  # 7.5 s
cuts = [0, 2 * B, 5 * B, 8 * B, 12 * B, 13 * B]

def words(im, t, items):
    for s, t0, y, col, size in items:
        k = ramp(t, t0, t0 + 0.16)
        if k <= 0: continue
        sc = 1.6 - 0.6 * eo(k)  # slam from big
        put(im, shadowed(text_img(s, 'black', size, col)), W // 2, y, sc, min(1, k * 2))
    return im

def F(t):
    if t < cuts[1]:  # empty land
        im = zoom(frame('bcn', 1), 1.0 + 0.08 * t / cuts[1]); im = darken(im, 0.38)
        im = words(im, t, [('EMPTY', 0.0, 820, WHITE, 210), ('LAND.', B * 0.5, 1040, WHITE, 210)])
        sh = 14 * math.exp(-((t % (B / 2)) * 18)); im = zoom(im, 1.0, dx=sh, dy=-sh)
    elif t < cuts[2]:  # one click -> generation, fast
        k = t - cuts[1]; im = clip('bcn', t, cuts[1], speed=4.0, start=40)
        im = zoom(im, 1.18 - 0.18 * eo(ramp(k, 0, 0.35)))
        put(im, shadowed(pill('ONE CLICK', 'black', 64, ORANGE)), W // 2 - 40 + 400 * (1 - eo(ramp(k, 0.05, 0.35))), 300, 1, ramp(k, 0.05, 0.2))
    elif t < cuts[3]:  # master plan builds, beat pulses
        k = t - cuts[2]; im = clip('gen', t, cuts[2], speed=6.5, start=260)
        pulse = 0.06 * math.exp(-((k % B) * 10)); im = zoom(im, 1.04 + pulse); im = grad(im, 1250, 1700, 0.7)
        put(im, shadowed(text_img('→ MASTER PLAN', 'black', 100)), W // 2, 1600, 0.7 + 0.3 * back(ramp(k, 0.1, 0.45)), ramp(k, 0.1, 0.2))
    elif t < cuts[4]:  # orbit + counter
        k = t - cuts[3]; im = zoom(clip('orbit', t, cuts[3], speed=2.0, start=80), 1.08)
        im = darken(im, 0.25 * ramp(k, 0, 0.3))
        n = int(1066 * eo(ramp(k, 0.15, 1.3)))
        num = shadowed(text_img(f'{n:,}', 'black', 260)); put(im, num, W // 2, 900, 0.85 + 0.15 * back(ramp(k, 0.1, 0.4)), ramp(k, 0.1, 0.2))
        put(im, shadowed(text_img('HOMES', 'black', 110, ORANGE, track=12)), W // 2, 1090, 1, ramp(k, 0.4, 0.55))
    elif t < cuts[5]:  # glitch norms
        k = t - cuts[4]; im = zoom(clip('spz', t, cuts[4], speed=3, start=1), 1.1)
        im = rgb_split(im, int(18 * math.exp(-k * 8))); im = zoom(im, 1, dx=10 * math.sin(k * 90))
        put(im, shadowed(pill('✓  NORMS CHECKED', 'black', 60, (16, 160, 90))), W // 2, 960, back(ramp(k, 0, 0.25)), 1)
    else:
        im = logo_card(t, cuts[5])
    # white flash on each cut
    for c in cuts[1:]:
        if 0 <= t - c < 0.1: im = flash(im, 0.85 * (1 - (t - c) / 0.1))
    return im

m = Mix(DUR)
for i in range(16):
    m.add(kick(0.9), i * B)
    m.add(hat(), i * B + B / 2)
    if i % 2 == 1: m.add(snare(0.35), i * B)
for i in range(13): m.add(bass(B, [55, 55, 65.4, 49][(i // 2) % 4]), i * B)
for c in cuts[1:]: m.add(whoosh(0.35, 0.6), c - 0.3)
m.add(pop(0.4, 660), 0.0); m.add(pop(0.4, 880), B * 0.5)
for j in range(14): m.add(tick(0.2), cuts[3] + 0.15 + j * 0.08)
m.add(boom(0.9), cuts[5])
render('A_tez_montaj', DUR, F, m)
