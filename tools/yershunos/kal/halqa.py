# Shahar atrofi ko'rsatkichi — to'liq halqa: shahar bilan chegaradosh barcha tumanlar (OSM geometriyasi bo'yicha qo'shnilik)
import json, sys, csv, osm2geojson
from shapely.geometry import shape
from shapely.ops import unary_union
K = sys.argv[1]
gj = osm2geojson.json2geojson(json.load(open(K + '/osm_chegaralar_uzb.json', encoding='utf-8')))
reg, co = [], []
for f in gj['features']:
    t = f['properties'].get('tags', {})
    try: g = shape(f['geometry']).buffer(0)
    except Exception: continue
    if g.is_empty or g.geom_type not in ('Polygon', 'MultiPolygon'): continue
    (reg if t.get('admin_level') == '4' else co).append([t.get('name:uz') or t.get('name') or '?', g])
for c in co:
    p = c[1].representative_point(); c.append(next((r[0] for r in reg if r[1].contains(p)), ''))
idx = {(v, n): g for n, g, v in co}
def vn(s): return s.lower().replace('viloyati', '').replace("'", '').replace('‘', '').strip()
def qoldiq(v):
    r = [x for x in reg if vn(x[0]) == vn(v)][0]
    d = r[1].difference(unary_union([g for n, g, vv in co if vv == r[0]]).buffer(1e-5))
    return sorted(getattr(d, 'geoms', [d]), key=lambda p: -p.area)[0].buffer(1e-5)
M = json.load(open('osm_moslik.json', encoding='utf-8'))
D = json.load(open('rasmiy_246.json', encoding='utf-8'))[0]['data']; RK = {r['Code']: r for r in D}; YIL = [str(y) for y in range(2010, 2027)]
for x in M: x['g'] = unary_union([qoldiq(n) if v == '__qoldiq__' else idx[(v, n)] for v, n in x['_az']])
def qator(rows): return [sum(RK[k][y] for x in rows for k in x['_kodlar']) for y in YIL]
def y0(rows): return max([x['chegara_ozgargan_yil'] or '2010' for x in rows] + ['2010'])
birl = []   # (nom, vil, [shahar qatorlari])
tosh = [x for x in M if x['vil'] == 'Toshkent sh']
birl.append(('Toshkent shahri', 'Toshkent', tosh))
for x in M:
    if x['vil'] != 'Toshkent sh' and 'shahri' in x['rasmiy_nom'] and 'tumani' not in x['rasmiy_nom']: birl.append((x['rasmiy_nom'], x['vil'], [x]))
out = []
for nom, vil, sh in birl:
    g = unary_union([x['g'] for x in sh]).buffer(0.002)
    hal = [x for x in M if x not in sh and x['g'].intersects(g) and 'shahri' not in x['rasmiy_nom'].replace(' + ', '|').split('|')[0]]
    hal = [x for x in hal if x['g'].intersection(g).area > 1e-7]
    if not hal: continue
    s0 = max(y0(sh), y0(hal)); i0 = YIL.index(s0); n = 16 - i0
    if n < 4: continue
    c = qator(sh); h = qator(hal); gc = ((c[16] / c[i0]) ** (1 / n) - 1) * 100; gh = ((h[16] / h[i0]) ** (1 / n) - 1) * 100
    out.append({'shahar': nom, 'vil': vil, 'halqa_soni': len(hal), 'halqa': ', '.join(x['rasmiy_nom'].replace(' tumani', '') for x in hal), 'davr': f'{s0}-2026',
                'shahar_2026': round(c[16] * 1000), 'halqa_2026': round(h[16] * 1000), 'shahar_yillik_%': round(gc, 2), 'halqa_yillik_%': round(gh, 2), 'farq_pp': round(gh - gc, 2),
                'osimdagi_halqa_ulushi_%': round((h[16] - h[i0]) / ((h[16] - h[i0]) + (c[16] - c[i0])) * 100), 'qoshimcha_shahar': round((c[16] - c[i0]) * 1000), 'qoshimcha_halqa': round((h[16] - h[i0]) * 1000)})
out.sort(key=lambda r: -r['shahar_2026'])
w = csv.DictWriter(open('uzb_shahar_halqa.csv', 'w', newline='', encoding='utf-8-sig'), fieldnames=list(out[0]), delimiter=';'); w.writeheader(); w.writerows(out)
print(len(out), 'shahar · halqa tezroq:', sum(r['farq_pp'] > 0 for r in out))
for r in out[:22]: print(f"{r['shahar'][:18]:18s} {r['davr']} sh {r['shahar_2026']:>8} {r['shahar_yillik_%']:5.2f} | halqa({r['halqa_soni']}) {r['halqa_2026']:>8} {r['halqa_yillik_%']:5.2f} | ulush {r['osimdagi_halqa_ulushi_%']:3d} % | {r['halqa'][:60]}")
tc = sum(r['qoshimcha_shahar'] for r in out if r['shahar_2026'] > 150000); th = sum(r['qoshimcha_halqa'] for r in out if r['shahar_2026'] > 150000)
print('150 mingdan katta shaharlar: qo\'shimcha shahar', tc, 'halqa', th, 'ulush', round(th / (tc + th) * 100))
