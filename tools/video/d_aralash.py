from fx import *
B = 60 / 128; DUR = 8.4
H1, H2 = 4 * B, 4 * B + 3.0   # hook end, cinematic end

def slam(im, s, t0, t, y, col=WHITE, size=200):
    k = ramp(t, t0, t0 + 0.16)
    if k > 0: put(im, shadowed(text_img(s, 'black', size, col)), W // 2, y, 1.6 - 0.6 * eo(k), min(1, 2 * k))

def card(lab, val, unit, k):
    im = rrect(820, 230, 44, (255, 255, 255, 245)); d = ImageDraw.Draw(im)
    d.text((50, 40), lab, font=font('semi', 42), fill=(90, 96, 110))
    d.text((50, 100), f'{int(val * eo(clamp(k))):,}{unit}', font=font('black', 96), fill=INK)
    return shadowed(im, 18, 8, 100)

def F(t):
    if t < H1:  # hook: hard cuts every half beat
        seq = [('bcn', 1), ('spz', 60), ('gen', 500), ('orbit', 200), ('bcn', 300), ('gen', 860), ('spz', 200), ('orbit', 330)]
        i = int(t / (B / 2)); n, f = seq[i % len(seq)]; k = (t % (B / 2)) / (B / 2)
        im = darken(zoom(frame(n, f + k * 6), 1.25 - 0.1 * k), 0.35)
        im = rgb_split(im, int(12 * (1 - k)))
        slam(im, '7 HECTARES.', 0.0, t, 860, WHITE, 150)
        slam(im, 'HOW MANY', B * 2, t, 1040, WHITE, 150)
        slam(im, 'HOMES?', B * 3, t, 1200, ORANGE, 190)
        if k < 0.25: im = flash(im, 0.5 * (1 - k / 0.25))
    elif t < H2:  # cinematic
        k = (t - H1) / (H2 - H1)
        im = grade_cine(zoom(clip('orbit', t, H1, 1.0, 60), 1.05 + 0.12 * eio(k)), t)
        im = light_leak(im, t, -0.2 + 1.4 * k, 0.22 * math.sin(math.pi * k)); im = grad(im, 1300, 1700, 0.7)
        put(im, text_img('Let the model answer.', 'light', 72, WHITE, track=int(14 - 8 * k)), W // 2, 1560, 1, ramp(t, H1 + 0.6, H1 + 1.4))
    else:  # infographic result
        k = t - H2; bg = darken(zoom(clip('orbit', t, H2, 0.5, 150), 1.15).filter(ImageFilter.GaussianBlur(8)), 0.3); im = bg
        for i, (lab, v, u) in enumerate([('Homes', 1066, ''), ('Residents', 1936, ''), ('Floor area', 90477, ' m²')]):
            kk = ramp(k, 0.12 * i, 0.12 * i + 0.4)
            put(im, card(lab, v, u, (k - 0.12 * i) * 1.2), W // 2 + int(500 * (1 - eo(kk))), 640 + 270 * i, 1, kk)
        put(im, pill('archemistry.uz', 'black', 56), W // 2, 1560, back(ramp(k, 1.2, 1.6)), ramp(k, 1.2, 1.3))
    if 0 <= t - H1 < 0.15: im = flash(im, 1 - (t - H1) / 0.15)
    if 0 <= t - H2 < 0.1: im = flash(im, 0.6 * (1 - (t - H2) / 0.1))
    return im

m = Mix(DUR)
for i in range(8): m.add(kick(0.9), i * B / 2 if i < 8 else 0); m.add(hat(0.2), i * B / 2 + B / 4)
m.add(riser(H1 - 0.2, 0.25), 0.1)
m.add(boom(1.0), H1)
m.add(pad(H2 - H1 + 0.5, [110, 130.8, 164.8, 196, 246.9], 0.16, 0.6), H1)
for j in range(3): m.add(pop(0.4, 880 + 110 * j), H2 + 0.12 * j)
for j in range(16): m.add(tick(0.14), H2 + 0.1 + j * 0.08)
for i in range(int((DUR - H2) / B) + 1): m.add(kick(0.5), H2 + i * B); m.add(hat(0.15), H2 + i * B + B / 2)
render('D_aralash', DUR, F, m)
