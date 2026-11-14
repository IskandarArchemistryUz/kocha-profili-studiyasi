# -*- coding: utf-8 -*-
"""GSHAP (1999) global PGA toʻri → Archemistry Lab uchun ixcham ball toʻri.

Ishga tushirish (repo ildizida):  python3 tools/gshap_build.py <GSHAP_ascii_fayl> [data/seis/gshap-ball-05.bin]

Kirish: GSHAP ASCII — har qatorda «lon lat pga» (pga — m/s², 10 % / 50 yil, 475 yil). Bosh qatorlar va boʻsh qatorlar oʻtkaziladi.
Chiqish: 720 × 360 uint8 (0,5° katak; qator 0 — shimol 90°…89,5°, ustun 0 — gʻarb −180°…−179,5°).
  0 — maʼlumot yoʻq; 6 — ≤ 6 (seysmik emas); 7, 8, 9; 10 — > 9.
Katak qiymati — ichidagi eng katta PGA (ehtiyotkor tomon). PGA → ball: core/seismichint.ts pgaToBall bilan bir xil
(g = pga / 9,81; 0,07 / 0,14 / 0,28 / 0,57 g chegaralari). Bu — taxmin: milliy xarita va meʼyor ustun.
"""
import sys, math, pathlib

G = 9.80665
def ball(g):
    if not g > 0: return 6
    return 6 if g < 0.07 else 7 if g < 0.14 else 8 if g < 0.28 else 9 if g < 0.57 else 10

def main(src, dst):
    W, H, D = 720, 360, 0.5
    mx = [[-1.0] * W for _ in range(H)]
    n = 0
    for ln in open(src, encoding='utf-8', errors='replace'):
        p = ln.replace(',', ' ').split()
        if len(p) < 3: continue
        try: lon, lat, pga = float(p[0]), float(p[1]), float(p[2])
        except ValueError: continue
        if lon > 180: lon -= 360
        c = min(W - 1, max(0, int((lon + 180) / D))); r = min(H - 1, max(0, int((90 - lat) / D)))
        if pga > mx[r][c]: mx[r][c] = pga
        n += 1
    out = bytearray(W * H)
    for r in range(H):
        for c in range(W):
            v = mx[r][c]
            out[r * W + c] = 0 if v < 0 else ball(v / G)
    pathlib.Path(dst).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(dst).write_bytes(bytes(out))
    hist = {b: out.count(b) for b in (0, 6, 7, 8, 9, 10)}
    print(f'{n} nuqta → {dst} ({len(out)} bayt); kataklar: {hist}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'data/seis/gshap-ball-05.bin')
