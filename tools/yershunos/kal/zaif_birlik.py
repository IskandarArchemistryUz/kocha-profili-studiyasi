# Zaiflik ko'rsatkichlari: SIAT (stat.uz) tuman kesimidagi rasmiy ma'lumot → 197 birlik
# Birlashgan birliklarda: sonlar qo'shiladi; foizlar aholi bo'yicha tortiladi (tuman kesimida kvartiralar soni 2018-yildan keyin e'lon qilinmagan). 0 = ma'lumot yo'q.
import json, sys, ast, numpy as np
S, MOS, CHIQ = sys.argv[1], sys.argv[2], sys.argv[3]
def ol(i):
    d = json.load(open(f'{S}/{i}.json', encoding='utf-8')); d = d[0] if isinstance(d, list) else d
    return {str(r['Code']): r for r in d['data']}
D = {i: ol(i) for i in (246, 2631, 1242, 1243, 3196, 3197, 3198, 1244, 1245, 500, 1875, 561, 2838, 589, 600, 1190, 1191, 223, 238, 239, 248, 247, 2846, 1432)}
def q(i, k, y):
    r = D[i].get(k)
    if not r: return None
    v = r.get(str(y))
    try: v = float(v)
    except Exception: return None
    return v if v > 0 else None
def oxirgi(i, k, ys=(2025, 2024, 2023)):
    for y in ys:
        v = q(i, k, y)
        if v is not None: return v, y
    return None, None
M = json.load(open(MOS, encoding='utf-8')); out = {}; yoq = {}
def jam(i, ks, ys=(2025, 2024, 2023)):          # sonlar yig'indisi; birortasi yo'q bo'lsa None
    v = [oxirgi(i, k, ys)[0] for k in ks]; return None if any(x is None for x in v) else sum(v)
def tort(i, ks, wi=246, ys=(2025, 2024, 2023)):     # aholi bo'yicha tortilgan o'rtacha
    a = [(oxirgi(i, k, ys)[0], oxirgi(wi, k, (2026, 2025))[0]) for k in ks]; a = [(v, w) for v, w in a if v is not None and w]
    return None if not a else sum(v * w for v, w in a) / sum(w for v, w in a)
r1 = lambda v, n=1: None if v is None else round(v, n)
for x in M:
    ks = ast.literal_eval(x['_kodlar']) if isinstance(x['_kodlar'], str) else x['_kodlar']; ks = [str(k) for k in ks]
    P = jam(246, ks, (2026, 2025)); P = P * 1000 if P else None; P25 = jam(246, ks, (2025,)); P25 = P25 * 1000 if P25 else P
    bol = [jam(i, ks, (2026, 2025)) for i in (561, 2838, 589, 600)]; kek = [jam(i, ks, (2026, 2025)) for i in (1190, 1191)]
    bol = None if any(v is None for v in bol) or not P else sum(bol) / P * 100; kek = None if any(v is None for v in kek) or not P else sum(kek) / P * 100
    mig = [(jam(238, ks, (y,)), jam(239, ks, (y,)), jam(246, ks, (y,))) for y in (2021, 2022, 2023, 2024, 2025)]; mig = [(a - b) / (p * 1000) * 1000 for a, b, p in mig if a is not None and b is not None and p]
    sh, qi = jam(248, ks, (2026, 2025)), jam(247, ks, (2026, 2025))
    if sh is None and qi is not None: sh = 0.0
    if qi is None and sh is not None: qi = 0.0
    shf, orn, tug, fond = jam(2846, ks), jam(1432, ks), jam(223, ks), jam(1244, ks)
    o = {'suv': r1(tort(2631, ks)), 'kan': r1(tort(1242, ks)), 'gaz': r1(tort(1243, ks)), 'isuv': r1(tort(3196, ks)), 'isq': r1(tort(3197, ks)),
         'uy': r1(tort(3198, ks, 246, tuple(range(2025, 2009, -1)))), 'uy_y': max((oxirgi(3198, k, tuple(range(2025, 2009, -1)))[1] or 0) for k in ks) or None, 'haq': r1(tort(500, ks, 246), 0), 'ishs': r1(tort(1875, ks, 246)),
         'bol': r1(bol), 'kek': r1(kek), 'mig': r1(float(np.mean(mig))) if mig else None, 'shahar': r1(sh / (sh + qi) * 100, 0) if sh is not None and (sh + qi) else None,
         'shf': r1(shf / P25 * 1e4) if shf and P25 else None, 'orn': r1(orn * 1000 / P25 * 1e4) if orn and P25 else None, 'tug': r1(tug / P25 * 1000) if tug and P25 else None}
    out[x['rasmiy_nom']] = o
    for k, v in o.items():
        if v is None: yoq.setdefault(k, []).append(x['rasmiy_nom'])
# respublika qiymatlari (tekshirish uchun) va ish haqini respublikaga nisbatan
RK = '1700' if '1700' in D[500] else next(k for k, r in D[500].items() if 'Respublikasi' in r['Klassifikator'] and 'zbekiston' in r['Klassifikator'])
resp = {n: oxirgi(i, RK)[0] for n, i in (('suv', 2631), ('kan', 1242), ('gaz', 1243), ('isuv', 3196), ('isq', 3197), ('haq', 500), ('ishs', 1875), ('uy', 3198))}
for o in out.values(): o['haq_n'] = None if o['haq'] is None else round(o['haq'] / resp['haq'] * 100)
# zaiflik indeksi: 6 ta tarkib, har biri 197 birlik ichidagi o'rni (0–100), teng vazn; ma'lumot yo'q tarkib tashlab ketiladi
def pct(vals):
    a = np.array([np.nan if v is None else v for v in vals], float); ok = np.isfinite(a); r = np.full(len(a), np.nan)
    for i in np.where(ok)[0]: r[i] = ((a[ok] < a[i]).sum() + ((a[ok] == a[i]).sum() - 1) / 2) / max(ok.sum() - 1, 1) * 100
    return r
N = list(out); T = {'suv': -1, 'kan': -1, 'haq': -1, 'ishs': 1, 'qaram': 1, 'shf': -1}
for n in N: out[n]['qaram'] = None if out[n]['bol'] is None or out[n]['kek'] is None else round(out[n]['bol'] + out[n]['kek'], 1)
PR = {k: pct([out[n][k] for n in N]) for k in T}
for j, n in enumerate(N):
    c = {k: (PR[k][j] if s > 0 else 100 - PR[k][j]) for k, s in T.items() if np.isfinite(PR[k][j])}
    out[n]['zt'] = {k: round(v) for k, v in c.items()}; out[n]['z'] = round(float(np.mean(list(c.values())))) if len(c) >= 4 else None
json.dump({'birlik': out, 'resp': resp}, open(CHIQ, 'w', encoding='utf-8'), ensure_ascii=False)
print('respublika:', resp); print("yo'q:", {k: (len(v), v[:6]) for k, v in yoq.items()})
for k in ('suv', 'kan', 'gaz', 'isq', 'uy', 'haq_n', 'ishs', 'bol', 'kek', 'mig', 'shf', 'orn', 'tug', 'shahar'):
    a = np.array([o[k] for o in out.values() if o[k] is not None]); print(k, 'n', len(a), 'min', a.min(), 'med', np.median(a), 'max', a.max())
z = sorted(((o['z'], n) for n, o in out.items() if o['z'] is not None), reverse=True); print('eng zaif:', z[:12]); print('eng kam:', z[-8:])
print('Baxmal:', out['Baxmal tumani'])
