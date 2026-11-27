"""Yershunos · jala skriningi (hidrologik, 2D model emas): har soy uchun havza, yetib kelish vaqti va cho'qqi sarf.
SCS-CN oqim qatlami + SCS uchburchak gidrografi: Qp = 0,208·A·Pe / Tp;  Tp = D/2 + 0,6·Tc;  Tc — Kirpich (eng uzun oqim yo'li).
Farazlar: jala butun havzaga bir tekis, D = 3 soat; CN = 75 (65–85 oralig'i bilan); maydon bo'yicha kamaytirish yo'q."""
import sys, os, json, math, csv, numpy as np
sys.argv = ['x', sys.argv[1] if len(sys.argv) > 1 else 'baxmal']; sys.path.insert(0, '/home/claude/ys/zanjir')
import hudud_xavf as H
K = '/mnt/user-data/uploads/Work/Yershunos/kesh'; H.KESH = K; H.DK = K + '/dem11'; H.HERE = os.getcwd(); H.HUD = '/home/claude/ys/zanjir/hudud/' + H.NOM
import geopandas as gpd
from pyproj import Transformer
from rasterio.features import rasterize
soz = json.load(open(H.HUD + '/sozlama.json')); ch = gpd.read_file(H.HUD + '/chegara.geojson'); b = ch.total_bounds; pad = 0.03
bbox = [float(round(b[0] - pad, 4)), float(round(b[1] - pad, 4)), float(round(b[2] + pad, 4)), float(round(b[3] + pad, 4))]
z, tr = H.dem(bbox); h, w = z.shape; n = h * w; dx = H.RES * math.cos(math.radians((bbox[1] + bbox[3]) / 2)); ckm = dx * dx / 1e6
d, tart, acc = H.oqim(z); zv = z.ravel().astype('float64')
# eng uzun oqim yo'li va uning boshidagi balandlik
L = np.zeros(n); zt = zv.copy()
for k in range(n - 1, -1, -1):
    c = tart[k]; p = d[c]
    if p >= 0:
        s = dx if (abs(p - c) == 1 or abs(p - c) == w) else dx * 1.4142
        if L[c] + s > L[p]: L[p] = L[c] + s; zt[p] = zt[c]
A = acc * ckm; S = np.maximum((zt - zv) / np.maximum(L, dx), 0.002)
Tc = 0.0195 * np.maximum(L, dx) ** 0.77 * S ** -0.385 / 60.0          # soat
def Q(P, cn=75, D=3.0):
    Sr = 25400.0 / cn - 254; Pe = max(P - 0.2 * Sr, 0) ** 2 / (P + 0.8 * Sr)
    return 0.208 * A * Pe / (D / 2 + 0.6 * Tc), Pe
# o'zan (≥ 1 km²) va har katakning o'zan katagi
st = A >= 1.0; base = np.full(n, -1, 'int64')
for k in range(n):
    c = tart[k]; base[c] = c if st[c] else (base[d[c]] if d[c] >= 0 else -1)
hand = np.where(base >= 0, zv - zv[np.maximum(base, 0)], np.nan)
# binolar
ich = ch.geometry.union_all() if hasattr(ch.geometry, 'union_all') else ch.unary_union
bg = gpd.read_parquet(K + f'/overture_building_{H.NOM}.parquet'); bg = bg[bg.geometry.notna()]; bg = bg[bg.intersects(ich)]
c3 = bg.geometry.to_crs('EPSG:3857').centroid; cc = ((c3.x.values - tr.c) / H.RES).astype(int); rr = ((tr.f - c3.y.values) / H.RES).astype(int)
ok = (cc >= 0) & (cc < w) & (rr >= 0) & (rr < h); ci = np.where(ok, rr * w + cc, 0)
bh = np.where(ok, hand[ci], np.nan); bb = np.where(ok, base[ci], -1); xav = (bh <= 5) & (bb >= 0)
cu = bg.geometry.to_crs('EPSG:32642').centroid; cen = np.c_[cu.x.values, cu.y.values]
el = json.load(open(K + f'/osm_joylar_{H.NOM}.json', encoding='utf-8'))['elements']
jl = [((e['tags'].get('name:uz') or e['tags'].get('name') or '?'), e['tags'].get('place'), e['lon'], e['lat']) for e in el if 'tags' in e]
T = Transformer.from_crs(4326, 32642, always_xy=True); jx, jy = T.transform([j[2] for j in jl], [j[3] for j in jl]); J = np.c_[jx, jy]
eng = np.empty(len(cen), 'int64'); mas = np.empty(len(cen))
for s in range(0, len(cen), 20000):
    dd = np.hypot(cen[s:s + 20000, None, 0] - J[None, :, 0], cen[s:s + 20000, None, 1] - J[None, :, 1]); eng[s:s + 20000] = dd.argmin(1); mas[s:s + 20000] = dd.min(1)
q30, _ = Q(30); q50, _ = Q(50); q80, pe80 = Q(80); q80lo, _ = Q(80, 65); q80hi, _ = Q(80, 85)
# umumiy: soy bo'yidagi binolar havza kattaligi va yetib kelish vaqti bo'yicha
Ab = A[np.maximum(bb, 0)]; Tb = Tc[np.maximum(bb, 0)]
def sin(v, ch_): return [int((xav & (v >= a) & (v < b_)).sum()) for a, b_ in zip(ch_[:-1], ch_[1:])]
N = {'hudud': soz['nom'], 'faraz': 'CN 75 (65–85), jala 3 soat, bir tekis; SCS uchburchak gidrografi; Kirpich', 'Pe_80mm': round(pe80, 1),
     'bino_soy5': int(xav.sum()), 'havza_sinflari_km2': [1, 10, 50, 300, 1e9], 'bino_havza_boyicha': sin(Ab, [1, 10, 50, 300, 1e9]),
     'vaqt_sinflari_soat': [0, 0.5, 1, 3, 1e9], 'bino_vaqt_boyicha': sin(Tb, [0, 0.5, 1, 3, 1e9]), 'qishloqlar': []}
for i, j in enumerate(jl):
    m = (mas <= 2000) & (eng == i); nb = int(m.sum()); mx = m & xav
    if nb < 15 or mx.sum() < 10: continue
    # eng ko'p bino bog'langan soy: binolar o'zan kataklari → shu qishloqdagi eng quyi (eng katta havzali) katak, daryolar (>300 km²) alohida
    a_ = Ab[mx]; kich = mx & (Ab <= 300)
    r = {'nom': j[0], 'tur': j[1], 'lon': round(j[2], 4), 'lat': round(j[3], 4), 'bino': nb, 'soy5': int(mx.sum()), 'daryo_boyida': int((mx & (Ab > 300)).sum())}
    if kich.sum() >= 5:
        bi = bb[kich]; t = bi[np.argmax(A[bi])]          # qishloqdagi eng katta soy (≤ 300 km²) katagi
        r.update({'soy_binolari': int(kich.sum()), 'havza_km2': round(float(A[t]), 1), 'yol_km': round(float(L[t] / 1000), 1), 'nishab_%': round(float(S[t] * 100), 1),
                  'vaqt_daq': round(float(Tc[t] * 60)), 'Q30': round(float(q30[t]), 1), 'Q50': round(float(q50[t]), 1), 'Q80': round(float(q80[t]), 1),
                  'Q80_oraliq': [round(float(q80lo[t]), 1), round(float(q80hi[t]), 1)],
                  'kichik_soy_binolari_<10km2': int((mx & (Ab < 10)).sum())})
    N['qishloqlar'].append(r)
N['qishloqlar'].sort(key=lambda r: -(r.get('soy_binolari', 0)))
json.dump(N, open('jala_' + H.NOM + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
f = ['nom', 'tur', 'lon', 'lat', 'bino', 'soy5', 'daryo_boyida', 'soy_binolari', 'havza_km2', 'yol_km', 'nishab_%', 'vaqt_daq', 'Q30', 'Q50', 'Q80', 'kichik_soy_binolari_<10km2']
w_ = csv.DictWriter(open('jala_' + H.NOM + '.csv', 'w', newline='', encoding='utf-8-sig'), fieldnames=f, extrasaction='ignore', delimiter=';'); w_.writeheader(); w_.writerows(N['qishloqlar'])
print('Pe(80 mm, CN75) =', N['Pe_80mm'], 'mm · soy bo\'yidagi binolar', N['bino_soy5'])
print('havza bo\'yicha [1–10, 10–50, 50–300, >300 km²]:', N['bino_havza_boyicha']); print('vaqt bo\'yicha [<30 daq, 30–60, 1–3 soat, >3 soat]:', N['bino_vaqt_boyicha'])
for r in N['qishloqlar'][:22]:
    if 'havza_km2' in r: print(f"{r['nom'][:22]:22s} bino {r['bino']:5d} soy≤5m {r['soy5']:4d} (daryo {r['daryo_boyida']:3d}) | soy havzasi {r['havza_km2']:6.1f} km² · {r['vaqt_daq']:4d} daq · Q30/50/80 = {r['Q30']:5.1f}/{r['Q50']:5.1f}/{r['Q80']:6.1f} m³/s ({r['Q80_oraliq'][0]}–{r['Q80_oraliq'][1]})")
# nazorat: 25 km² havza
i = np.argmin(np.abs(A - 25) + (~st) * 1e9); print('nazorat ~25 km²:', round(A[i], 1), 'km², Tc', round(Tc[i] * 60), 'daq, Q80', round(q80[i], 1))
