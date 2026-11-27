from fx import *
DUR = 8.0
BAR = 150

def F(t):
    k = t / DUR
    im = clip('orbit', t, 0, speed=1.0, start=40)
    im = zoom(im, 1.06 + 0.16 * eio(k), cx=0.5, cy=0.48)
    im = grade_cine(im, t)
    im = light_leak(im, t, -0.3 + 1.6 * k, 0.28 * math.sin(math.pi * k)); im = grad(im, 1150, 1650, 0.72)
    # fade from black
    im = darken(im, 1 - eo(ramp(t, 0, 1.2)))
    d = ImageDraw.Draw(im)
    b = int(BAR * eo(ramp(t, 0, 0.8)))
    d.rectangle((0, 0, W, b), fill=(0, 0, 0)); d.rectangle((0, H - b, W, H), fill=(0, 0, 0))
    # titles: wide letter spacing collapsing
    a1 = ramp(t, 1.4, 2.4) * (1 - ramp(t, 4.6, 5.4))
    put(im, text_img('A district', 'light', 92, WHITE, track=int(28 - 18 * eo(ramp(t, 1.4, 3.5)))), W // 2, 1420, 1, a1)
    a2 = ramp(t, 2.6, 3.6) * (1 - ramp(t, 4.6, 5.4))
    put(im, text_img('before it exists.', 'light', 92, WHITE, track=int(20 - 12 * eo(ramp(t, 2.6, 4.6)))), W // 2, 1530, 1, a2)
    a3 = ramp(t, 5.6, 6.6)
    put(im, text_img('ARCHEMISTRY  LAB', 'semi', 46, WHITE, track=int(26 - 10 * eo(ramp(t, 5.6, 7.6)))), W // 2, 1480, 1, a3)
    put(im, text_img('archemistry.uz', 'light', 40, (220, 225, 235), track=6), W // 2, 1550, 1, ramp(t, 6.2, 7.0))
    im = darken(im, ramp(t, 7.5, 8.0))
    return im

m = Mix(DUR)
m.add(pad(DUR, [110, 130.8, 164.8, 196, 246.9], 0.16, 2.0), 0)    # Am9
m.add(pad(DUR, [55], 0.10, 2.5), 0)
m.add(riser(2.0, 0.18), 3.6)
m.add(boom(0.55), 5.6)
for i, f in enumerate([659, 587, 523, 494, 440]): m.add(pluck(f, 0.07, 1.2), 1.4 + i * 0.9)
render('B_kinematografik', DUR, F, m)
