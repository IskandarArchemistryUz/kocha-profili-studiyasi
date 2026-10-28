#!/usr/bin/env python3
"""
Narx «soti» (olti burchakli katakchalar): uybor.uz eʼlonlari → har katakda median $/m².
Kirish: narx_stats.py bilan bir xil xom fayl («kategoriya|id;usd;m2;xona;lat;lng;auksion;upAt[;districtId]»).
Chiqish:
  - CSV tarixi (har sana, kategoriya, oʻlcham uchun qatorlar; shu sana boʻlsa — almashtiriladi);
  - GeoJSON — eng soʻnggi holat (xarita uchun): har katak — koʻpburchak, xossalari:
      kat (kvartira | hovli | hammasi), olcham_m, n (yaroqli eʼlonlar; 5 dan kam boʻlsa — faqat "<5"),
      median, p25, p75 ($/m²; kam boʻlsa — yoʻq).
Maxfiylik: repo ochiq — 5 tadan kam eʼlonli katakda narx yozilmaydi (alohida eʼlon tiklanmasin),
katak markazi yoziladi, eʼlon koordinatasi emas. Narxsiz katakchalar faqat shahar konturi (eʼlonlar qobigʻi) ichida beriladi —
xaritada «maʼlumot yetarli emas» (oq) boʻlib koʻrinadi.
Eslatma: bu SOʻRALGAN narx, bitim narxi emas.
Ishlatish: python3 tools/narx_hex.py xom.txt [--olcham 1000 1500] [--min 5] [--sana YYYY-MM-DD]
           [--csv data/narx/toshkent_hex_uybor.csv] [--geojson data/narx/toshkent_hex.geojson]
"""
import argparse, csv, json, math, os, statistics as st, datetime as dt
from narx_stats import parse, clean, q

# Toʻr boshi — oʻzgartirmang (katak id lari kunlar orasida mos kelsin)
LAT0, LNG0 = 41.10, 69.05
M_LAT = 111320.0
M_LNG = 111320.0 * math.cos(math.radians(41.3))
HEAD = ['sana', 'manba', 'kategoriya', 'olcham_m', 'katak', 'markaz_lat', 'markaz_lng',
        'yaroqli', 'median_usd_m2', 'p25_usd_m2', 'p75_usd_m2']


def xy(lat, lng):
    return (lng - LNG0) * M_LNG, (lat - LAT0) * M_LAT


def ll(x, y):
    return round(LAT0 + y / M_LAT, 5), round(LNG0 + x / M_LNG, 5)


def hex_of(x, y, w):
    """Uchli (pointy-top) olti burchak, w — qarama-qarshi tomonlar orasidagi masofa (m). Axial (q, r)."""
    R = w / math.sqrt(3)                       # markazdan uchigacha
    qf = (math.sqrt(3) / 3 * x - y / 3) / R
    rf = (2 / 3 * y) / R
    xc, zc = qf, rf; yc = -xc - zc
    rx, ry, rz = round(xc), round(yc), round(zc)
    dx, dy, dz = abs(rx - xc), abs(ry - yc), abs(rz - zc)
    if dx > dy and dx > dz: rx = -ry - rz
    elif dy > dz: ry = -rx - rz
    else: rz = -rx - ry
    return rx, rz


def center(qh, rh, w):
    R = w / math.sqrt(3)
    return R * math.sqrt(3) * (qh + rh / 2), R * 1.5 * rh


def ring(qh, rh, w):
    R = w / math.sqrt(3); cx, cy = center(qh, rh, w); pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        lat, lng = ll(cx + R * math.cos(a), cy + R * math.sin(a))
        pts.append([lng, lat])
    return pts + [pts[0]]


def hull(pts):
    p = sorted(set(pts))
    if len(p) < 3: return p
    cr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for v in p:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], v) <= 0: lo.pop()
        lo.append(v)
    for v in reversed(p):
        while len(up) >= 2 and cr(up[-2], up[-1], v) <= 0: up.pop()
        up.append(v)
    return lo[:-1] + up[:-1]


def inside(pt, poly, pad):
    """nuqta qobiq ichida yoki undan pad metrdan yaqin"""
    n = len(poly); c = False
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        if (a[1] > pt[1]) != (b[1] > pt[1]) and pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]: c = not c
    if c: return True
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]; dx, dy = b[0] - a[0], b[1] - a[1]
        t = max(0, min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / (dx * dx + dy * dy or 1)))
        if math.hypot(pt[0] - a[0] - t * dx, pt[1] - a[1] - t * dy) <= pad: return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--olcham', type=int, nargs='+', default=[1000, 1500])
    ap.add_argument('--min', type=int, default=5)
    ap.add_argument('--sana', default=dt.date.today().isoformat())
    ap.add_argument('--csv', default='data/narx/toshkent_hex_uybor.csv')
    ap.add_argument('--geojson', default='data/narx/toshkent_hex.geojson')
    a = ap.parse_args()
    cats = {}
    for cat, c in parse(a.src).items():
        ok, *_ = clean(c['rows'])
        cats[cat] = [(xy(r['lat'], r['lng']), r['v']) for r in ok]
    cats['hammasi'] = [v for k in list(cats) for v in cats[k]]
    allpts = [p for p, _ in cats['hammasi']]
    H = hull(allpts)
    rows, feats = [], []
    for w in a.olcham:
        for cat, data in cats.items():
            cells = {}
            for (x, y), v in data:
                cells.setdefault(hex_of(x, y, w), []).append(v)
            # qobiq ichidagi barcha katakchalar (narxsizlari — oq)
            xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
            grid = set(cells)
            if H:
                q0, r0 = hex_of(min(xs) - w, min(ys) - w, w); q1, r1 = hex_of(max(xs) + w, max(ys) + w, w)
                for rr in range(min(r0, r1) - 2, max(r0, r1) + 3):
                    for qq in range(min(q0, q1) - abs(r1 - r0) - 3, max(q0, q1) + abs(r1 - r0) + 3):
                        if inside(center(qq, rr, w), H, w * 0.5): grid.add((qq, rr))
            shown = 0
            for (qh, rh) in sorted(grid):
                v = cells.get((qh, rh), [])
                cx, cy = center(qh, rh, w); lat, lng = ll(cx, cy)
                pr = {'kat': cat, 'olcham_m': w, 'katak': f'{qh}_{rh}'}
                if len(v) >= a.min:
                    shown += 1
                    m, p25, p75 = round(st.median(v)), round(q(v, .25)), round(q(v, .75))
                    pr.update(n=len(v), median=m, p25=p25, p75=p75)
                    rows.append([a.sana, 'uybor.uz', cat, w, f'{qh}_{rh}', lat, lng, len(v), m, p25, p75])
                else:
                    pr.update(n='<5' if v else 0)
                feats.append({'type': 'Feature', 'properties': pr, 'geometry': {'type': 'Polygon', 'coordinates': [ring(qh, rh, w)]}})
            print(f'{cat} {w} m: yaroqli={len(data)}, narxli katak={shown}, jami katak={len(grid)}')
    old = []
    if os.path.exists(a.csv):
        with open(a.csv, encoding='utf-8') as fh: old = list(csv.reader(fh))[1:]
    done = {(r[0], r[2], str(r[3])) for r in rows}
    keep = [r for r in old if (r[0], r[2], r[3]) not in done]
    os.makedirs(os.path.dirname(a.csv) or '.', exist_ok=True)
    with open(a.csv, 'w', encoding='utf-8', newline='') as fh:
        wr = csv.writer(fh); wr.writerow(HEAD); wr.writerows(keep + rows)
    gj = {'type': 'FeatureCollection',
          'meta': {'sana': a.sana, 'manba': 'uybor.uz (soʻralgan narx, bitim narxi emas)', 'birlik': 'USD/m²', 'min_eʼlon': a.min,
                   'olchamlar_m': a.olcham, 'izoh': 'olcham_m — olti burchakning qarama-qarshi tomonlari orasidagi masofa'},
          'features': feats}
    with open(a.geojson, 'w', encoding='utf-8') as fh:
        json.dump(gj, fh, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main()
