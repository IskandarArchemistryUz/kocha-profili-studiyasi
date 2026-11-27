# agent natijasini aniq javob (IFC) bilan solishtirish: devorlar (precision/recall/F1), qalinlik, teshiklar
import sys, json, math
from shapely.geometry import LineString, Polygon, Point
from shapely.ops import unary_union
gt = json.load(open(sys.argv[1])); pr = json.load(open(sys.argv[2])); tol = 100
tf = gt['tf']; T = lambda p: (p[0] - tf['x0'], tf['y1'] - p[1])
G = unary_union([Polygon([T(p) for p in c]).buffer(0) for w in gt['walls'] for c in w['cut'] if len(c) > 3])
P_lines = [LineString([tuple(w['a']), tuple(w['b'])]) for w in pr['walls'] if w['a'] != w['b']]
P_buf = unary_union([LineString([tuple(w['a']), tuple(w['b'])]).buffer(w['t'] / 2 + tol, cap_style=2) for w in pr['walls'] if w['a'] != w['b']]) if P_lines else Polygon()
Lp = sum(l.length for l in P_lines) or 1; Gb = unary_union([G] + [Polygon([T(p) for p in o['hull']]).buffer(0) for o in gt.get('openings_full', [])]).buffer(tol)  # shisha devor deraza ustida — to'g'ri
prec = sum(l.intersection(Gb).length for l in P_lines) / Lp
G40 = G.buffer(40); onink = sum(l.intersection(G40).length for l in P_lines) / Lp  # o'q chizig'i devor tanasi ichida (±40 mm)
rec = G.intersection(P_buf).area / G.area
f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
# qalinlik: har bashorat devori o'rtasidagi GT devor qalinligi
terr = []
for w in pr['walls']:
    m = Point((w['a'][0] + w['b'][0]) / 2, (w['a'][1] + w['b'][1]) / 2)
    for g in gt['walls']:
        pg = unary_union([Polygon([T(p) for p in c]).buffer(0) for c in g['cut'] if len(c) > 3])
        if pg.buffer(tol).contains(m): terr.append(abs(w['t'] - g['t'])); break
terr.sort()
# teshiklar
gops = [{'kind': o['kind'], 'c': T(o['c']), 'w': o['w']} for o in gt['openings']]
used = set(); hit = 0; werr = []
for o in pr['ops']:
    best = None
    for i, g in enumerate(gops):
        if i in used: continue
        d = math.dist(o['c'], g['c'])
        if d < 600 and (best is None or d < best[0]): best = (d, i)
    if best: used.add(best[1]); hit += 1; werr.append(abs(o['w'] - gops[best[1]]['w']))
# xonalar: GT — devorlar + eshik/deraza konturlari birlashmasi ichidagi bo'shliqlar (≥ 1,5 m²); bashorat — Binokor xonalari; moslik IoU ≥ 0,5
GO = unary_union([G] + [Polygon([T(p) for p in o['hull']]).buffer(0) for o in gt.get('openings_full', [])]).buffer(250).buffer(-250)
gr = [Polygon(h.coords) for g in (GO.geoms if hasattr(GO, 'geoms') else [GO]) for h in g.interiors]; gr = [r for r in gr if r.area > 1.5e6]
prr = [Polygon(r).buffer(0) for r in pr.get('roomP', []) if len(r) > 2]; rm = 0; usedr = set()
for r in prr:
    for i, g in enumerate(gr):
        if i in usedr: continue
        if r.intersection(g).area / r.union(g).area >= 0.5: usedr.add(i); rm += 1; break
res = {'onink': round(onink, 3), 'wall_P': round(prec, 3), 'wall_R': round(rec, 3), 'wall_F1': round(f1, 3), 'n_pred': len(pr['walls']), 'n_gt': len(gt['walls']), 't_med_err': terr[len(terr) // 2] if terr else None,
       'op_P': round(hit / max(1, len(pr['ops'])), 3), 'op_R': round(hit / max(1, len(gops)), 3), 'op_w_err': sorted(werr)[len(werr) // 2] if werr else None, 'bad': len(pr['bad']), 'FAIL': len(pr['fails']), 'rooms': pr['rooms'], 'rooms_gt': len(gr), 'room_R': round(rm / max(1, len(gr)), 3)}
print(json.dumps(res))
if len(sys.argv) > 3: json.dump(res, open(sys.argv[3], 'w'))
