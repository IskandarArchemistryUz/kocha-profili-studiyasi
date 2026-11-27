# OSM chegaralari + kalibrlash jadvali -> sahifa uchun soddalashtirilgan GeoJSON (kalibrlash qatori bo'yicha birlashtirilgan)
import json, os, sys, shapely, osm2geojson
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
K, MOS, CHIQ = sys.argv[1], sys.argv[2], sys.argv[3]
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
idx = {}
for n, g, v in co:
    assert (v, n) not in idx, (v, n); idx[(v, n)] = g
def vnorm(s): return s.lower().replace('viloyati', '').replace("'", '').replace('‘', '').strip()
def qoldiq(v):
    r = [x for x in reg if vnorm(x[0]) == vnorm(v)][0]
    d = r[1].difference(unary_union([g for n, g, vv in co if vv == r[0]]).buffer(1e-5))
    parts = sorted(getattr(d, 'geoms', [d]), key=lambda p: -p.area)
    return parts[0].buffer(1e-5)
M = json.load(open(MOS, encoding='utf-8'))
VJ = json.load(open(os.path.join(os.path.dirname(MOS), 'vil.json'), encoding='utf-8'))
IQ = json.load(open(os.path.join(os.path.dirname(MOS), 'iqlim_birlik.json'), encoding='utf-8'))
YR = json.load(open(os.path.join(os.path.dirname(MOS), 'yer_birlik.json'), encoding='utf-8'))
SV = json.load(open(os.path.join(os.path.dirname(MOS), 'su_birlik.json'), encoding='utf-8'))
ZF = json.load(open(os.path.join(os.path.dirname(MOS), 'zaif_birlik.json'), encoding='utf-8'))   # zaif_birlik.py chiqishi
#   # su_birlik.py chiqishi
#        # yer_birlik.py chiqishi   # iqlim_birlik.py chiqishi
feats, used = [], set()
for x in M:
    gs = []
    for v, n in x['_az']:
        if v == '__qoldiq__': gs.append(qoldiq(n))
        else: gs.append(idx[(v, n)]); used.add((v, n))
    g = unary_union(gs).buffer(0)
    p = {'n': x['rasmiy_nom'], 'v': VJ['nom'][x['vil']], 's': x['_s'], 'oz': x.get('_oz'), 'c': {k: v for k, v in IQ[x['rasmiy_nom']].items() if not k.startswith('_')}, 'e': YR[x['rasmiy_nom']], 'w': SV[x['rasmiy_nom']], 'j': ZF['birlik'][x['rasmiy_nom']], 'p50': x['prognoz_2050'] if x['prognoz_2050'] != '' else None, 'km': x['km2'], 'r10': x['rasmiy_2010'], 'r20': x['rasmiy_2020'], 'r26': x['rasmiy_2026'],
         'g20': x['ghs_2020'], 'k': x['k_2020'] if x['k_2020'] != '' else None, 'z': x['zichlik_2026_kishi_km2'], 'o': x['osish_2010_2026_%'], 'y': x['yillik_%'],
         'ob': x['osish_birligi'], 'ch': x['chegara_ozgargan_yil'], 'iz': x['izoh']}
    feats.append((g, p))
print('poligon:', len(co), 'ishlatilgan:', len(used), 'qator:', len(feats), 'ishlatilmagan:', [k for k in idx if k not in used])
geoms = [g for g, _ in feats]
try:
    s = shapely.coverage_simplify(geoms, 0.004); usul = 'coverage'
    assert all(not a.is_empty for a in s)
except Exception as e:
    print('coverage ishlamadi:', str(e)[:80]); s = [g.simplify(0.003, preserve_topology=True) for g in geoms]; usul = 'oddiy'
out = {'type': 'FeatureCollection', 'vil': VJ['qator'], 'ij': ZF['resp'], 'features': []}
for g, (_, p) in zip(s, feats):
    g = shapely.set_precision(g, 0.0001)
    if g.is_empty: print('bo\'sh:', p['n']); continue
    out['features'].append({'type': 'Feature', 'properties': p, 'geometry': mapping(g)})
json.dump(out, open(CHIQ, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
import os; print(usul, len(out['features']), os.path.getsize(CHIQ) // 1024, 'KB', 'chegara:', unary_union(geoms).bounds)
