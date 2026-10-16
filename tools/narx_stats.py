#!/usr/bin/env python3
"""
Kunlik narx monitoringi (sinov): uybor.uz eʼlonlari → jamlangan statistika.
Kirish (fayl): har qator «kategoriya|id;usd;m2;xona;lat;lng;auksion;upAt», hamda «kategoriya|TOTAL=n».
Chiqish: data/narx/mirobod_uybor.csv ga har kategoriya uchun bitta qator (shu sana boʻlsa — almashtiriladi).
Xom eʼlonlar saqlanmaydi (repo ochiq) — faqat jamlanma.
Eslatma: bu SOʻRALGAN narx, sotilgan narx emas; auksion boshlangʻich narxlari chiqariladi.
Ishlatish: python3 tools/narx_stats.py xom.txt [data/narx/mirobod_uybor.csv]
"""
import csv, math, statistics as st, sys, os, datetime as dt

ORIGIN = (41.26936, 69.29678)   # Abdurauf Fitrat loyihasi markazi (Mirobod)
NEAR_M = 1500
HEAD = ['sana', 'manba', 'hudud', 'kategoriya', 'api_jami', 'oqildi', 'yaroqli', 'median_usd_m2', 'p25_usd_m2', 'p75_usd_m2',
        'atrof_1500m_soni', 'atrof_1500m_median_usd_m2', 'auksion_chiqarildi', 'takror_chiqarildi', 'chetki_chiqarildi', 'yangi_30kun_ulushi']


def dist(a, b):
    R = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    return 2 * R * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))


def q(v, p):
    v = sorted(v); k = (len(v) - 1) * p; f, c = math.floor(k), math.ceil(k)
    return v[f] if f == c else v[f] + (v[c] - v[f]) * (k - f)


def main():
    src_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'data/narx/mirobod_uybor.csv'
    today = dt.date.today().isoformat()
    now = dt.datetime.now(dt.timezone.utc)
    cats = {}
    with open(src_path, encoding='utf-8') as src:
        for line in src:
            line = line.strip()
            if '|' not in line:
                continue
            cat, rest = line.split('|', 1)
            c = cats.setdefault(cat, {'total': '', 'rows': []})
            if rest.startswith('TOTAL='):
                c['total'] = rest[6:]; continue
            f = rest.split(';')
            if len(f) < 8:
                continue
            try:
                c['rows'].append({'id': f[0], 'usd': float(f[1]), 'm2': float(f[2]), 'lat': float(f[4]), 'lng': float(f[5]), 'auc': f[6].strip() == 'true', 'up': f[7].strip()})
            except ValueError:
                pass
    out = []
    for cat, c in cats.items():
        rows = c['rows']; ids, seen = set(), set(); auc = dup = bad = 0; ok = []
        for r in rows:
            if r['id'] in ids:
                dup += 1; continue
            ids.add(r['id'])
            if r['auc']:
                auc += 1; continue
            key = (round(r['usd']), round(r['m2'], 1), round(r['lat'], 4), round(r['lng'], 4))
            if key in seen:            # bir eʼlon qayta joylangan
                dup += 1; continue
            seen.add(key)
            if r['m2'] <= 10:
                bad += 1; continue
            v = r['usd'] / r['m2']
            if not 150 <= v <= 15000:
                bad += 1; continue
            r['v'] = v; ok.append(r)
        vals = [r['v'] for r in ok]
        near = [r['v'] for r in ok if dist(ORIGIN, (r['lat'], r['lng'])) <= NEAR_M]
        fresh = 0
        for r in ok:
            try:
                if (now - dt.datetime.fromisoformat(r['up'].replace('Z', '+00:00'))).days <= 30:
                    fresh += 1
            except ValueError:
                pass
        R = lambda x: round(x) if x is not None else ''
        out.append([today, 'uybor.uz', 'Mirobod', cat, c['total'], len(rows), len(ok),
                    R(st.median(vals) if vals else None), R(q(vals, .25) if vals else None), R(q(vals, .75) if vals else None),
                    len(near), R(st.median(near) if near else None), auc, dup, bad, round(fresh / len(ok), 2) if ok else ''])
    old = []
    if os.path.exists(out_path):
        with open(out_path, encoding='utf-8') as fh:
            old = list(csv.reader(fh))[1:]
    keep = [r for r in old if not (r[0] == today and r[3] in cats)]
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    with open(out_path, 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh); w.writerow(HEAD); w.writerows(keep + out)
    for r in out:
        print(dict(zip(HEAD, r)))


if __name__ == '__main__':
    main()
