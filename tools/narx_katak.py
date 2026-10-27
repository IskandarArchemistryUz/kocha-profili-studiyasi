#!/usr/bin/env python3
"""
Narx katakchalari: uybor.uz eʼlonlari → ~1 km lik katakchalar boʻyicha median $/m².
Kirish: narx_stats.py bilan bir xil xom fayl («kategoriya|id;usd;m2;xona;lat;lng;auksion;upAt[;districtId]»).
Chiqish: CSV ga har (kategoriya, katak) uchun bitta qator (shu sana boʻlsa — almashtiriladi).
Maxfiylik: repo ochiq — yaroqli eʼlonlari MIN_SONI dan kam katakchalar yozilmaydi (alohida eʼlon tiklanmasin);
katak markazi yoziladi, eʼlon koordinatasi emas.
Eslatma: bu SOʻRALGAN narx, sotilgan narx emas.
Ishlatish: python3 tools/narx_katak.py xom.txt data/narx/toshkent_katak_uybor.csv [--olcham 1000] [--min 5] [--sana YYYY-MM-DD]
"""
import argparse, csv, math, os, statistics as st, datetime as dt
from narx_stats import parse, clean, q

# Toʻr boshi (Toshkentdan janubi-gʻarbda) — oʻzgartirmang, aks holda katak id lari kunlar orasida mos kelmaydi
LAT0, LNG0 = 41.10, 69.05
M_LAT = 111320.0
M_LNG = 111320.0 * math.cos(math.radians(41.3))
HEAD = ['sana', 'manba', 'kategoriya', 'olcham_m', 'katak', 'markaz_lat', 'markaz_lng',
        'yaroqli', 'median_usd_m2', 'p25_usd_m2', 'p75_usd_m2']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out', nargs='?', default='data/narx/toshkent_katak_uybor.csv')
    ap.add_argument('--olcham', type=int, default=1000); ap.add_argument('--min', type=int, default=5)
    ap.add_argument('--sana', default=dt.date.today().isoformat())
    a = ap.parse_args()
    dlat, dlng = a.olcham / M_LAT, a.olcham / M_LNG
    out = []; info = {}
    for cat, c in parse(a.src).items():
        ok, *_ = clean(c['rows'])
        cells = {}
        for r in ok:
            i, j = int((r['lat'] - LAT0) // dlat), int((r['lng'] - LNG0) // dlng)
            cells.setdefault((i, j), []).append(r['v'])
        shown = 0
        for (i, j), v in sorted(cells.items()):
            if len(v) < a.min:
                continue
            shown += 1
            out.append([a.sana, 'uybor.uz', cat, a.olcham, f'{i}_{j}',
                        round(LAT0 + (i + .5) * dlat, 5), round(LNG0 + (j + .5) * dlng, 5),
                        len(v), round(st.median(v)), round(q(v, .25)), round(q(v, .75))])
        info[cat] = (len(ok), len(cells), shown, sum(len(v) for v in cells.values() if len(v) >= a.min))
    old = []
    if os.path.exists(a.out):
        with open(a.out, encoding='utf-8') as fh:
            old = list(csv.reader(fh))[1:]
    done = {(r[0], r[2], str(r[3])) for r in out}
    keep = [r for r in old if (r[0], r[2], r[3]) not in done]
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    with open(a.out, 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh); w.writerow(HEAD); w.writerows(keep + out)
    for cat, (n, nc, ns, nin) in info.items():
        print(f'{cat}: yaroqli={n}, katakchalar={nc}, yozildi={ns} (min {a.min}), ulardagi eʼlonlar={nin}')


if __name__ == '__main__':
    main()
