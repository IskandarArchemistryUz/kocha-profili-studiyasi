# Test: «Referensdan dizayn» — Tashkent City, OSM way 1453164346 (0,44 ga)
# Koordinatalar: metr, markaz 41.31337 N, 69.25197 E; x — sharq, y — shimol.
import json, math
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from shapely import affinity

SITE = Polygon([(27, -28), (34, 45), (-26, 51), (-32, -18), (-29, -23)])
FOUNTAIN = Polygon([(4,4),(1,3),(-2,4),(-5,5),(-7,8),(-8,11),(-8,14),(-7,17),(-5,20),(-3,21),(0,22),(3,22),(6,21),(9,19),(10,16),(11,13),(11,10),(9,7),(7,5)])
CTX = {
 "b5":  [(82,37),(67,38),(67,32),(46,34),(41,-22),(62,-24),(62,-30),(75,-32),(78,5)],
 "bN":  [(98,56),(82,58),(32,62),(22,63),(11,64),(13,89),(24,88),(35,87),(84,83),(101,81)],
 "bw1": [(-46,-31),(-46,-47),(-55,-47),(-55,-31)],
 "bw2": [(-64,30),(-50,29),(-52,9),(-66,10)],
 "bw3": [(-49,50),(-36,49),(-37,38),(-49,39)],
 "nest":[(27,-178),(63,-181),(87,-182),(88,-175),(89,-164),(91,-138),(92,-129),(92,-121),(32,-117),(-29,-112),(-71,-108),(-91,-107),(-92,-118),(-94,-148),(-96,-168),(-34,-173)],
 "nest2":[(83,-105),(36,-101),(37,-90),(44,-90),(46,-68),(86,-72)],
 "opera":[(-163,-119),(-167,-115),(-162,-57),(-157,-53),(-125,-56),(-121,-60),(-126,-118),(-131,-122)],
 "hotel":[(102,125),(22,133),(-39,139),(-60,144),(-58,165),(-51,168),(-37,166),(25,161),(104,152)],
 "bwN": [(-93,100),(-94,93),(-88,92),(-80,92),(-80,99),(-87,100)],
}
ROADS = {
 "Uqchi koʻchasi": [(142,96),(-85,117),(-160,124)],
 "Yangi Toshkent koʻchasi": [(-87,135),(-88,92),(-102,-40),(-115,-160)],
 "Olmazor koʻchasi": [(142,96),(135,29),(127,-64),(117,-130)],
 "Botir Zokirov koʻchasi": [(152,95),(143,-8),(139,-127)],
}
PARKING = [[(-95,91),(-104,87),(-108,38),(-101,33),(-100,38),(-95,86)], [(127,29),(118,-54),(114,-49),(121,20)]]

def blob(cx, cy, rx, ry, rot, k=0.18, seed=1, n=60):
    pts = []
    for i in range(n):
        a = 2*math.pi*i/n
        r = 1 + k*math.sin(2*a+seed) + 0.6*k*math.cos(3*a+2*seed)
        pts.append((rx*r*math.cos(a), ry*r*math.sin(a)))
    p = Polygon(pts)
    p = affinity.rotate(p, rot, origin=(0,0))
    return affinity.translate(p, cx, cy).buffer(0)

def curve(pts, w):
    return LineString(pts).buffer(w/2, cap_style=1, join_style=1)

def bez(p0, p1, p2, n=24):
    return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0], (1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in [i/n for i in range(n+1)]]

R_SITE = SITE.buffer(-5, join_style=1).buffer(5, join_style=1)   # burchaklar yumaloq (referens)

def variant(kind):
    edge = 1.5 if kind != "erkin" else 3.0
    loop_w = {"qatiy": 4.5, "muvozanat": 2.4, "erkin": 2.4}[kind]
    outer = R_SITE.buffer(-edge, join_style=1)
    inner = outer.buffer(-loop_w, join_style=1)
    loop = outer.difference(inner)
    el = {"loop": loop, "edge": R_SITE.difference(outer)}
    cx, cy = R_SITE.centroid.x, R_SITE.centroid.y
    if kind == "qatiy":
        play1 = blob(cx-10, cy+12, 15, 8.5, -35, 0.22, 2)
        play2 = blob(cx+9, cy-9, 14, 9, -35, 0.22, 5)
        conn = curve(bez((cx-24, cy-24), (cx+2, cy+2), (cx+22, cy+26)), 3.0)
        deck1 = blob(cx+15, cy+19, 9, 6.5, -35, 0.08, 3)
        deck2 = blob(cx-16, cy-16, 7, 5, -35, 0.08, 4)
        play = unary_union([play1, play2]).intersection(inner)
        hard = unary_union([conn, deck1, deck2]).intersection(inner).difference(play)
        canopies = [Point(cx+15, cy+19).buffer(5.5), Point(cx+11, cy-12).buffer(5), Point(cx-2, cy+3).buffer(4.5)]
        pergolas = [affinity.rotate(Polygon([(-3,-2),(3,-2),(3,2),(-3,2)]), -35).buffer(0)]
        pergolas = [affinity.translate(pergolas[0], cx-18, cy+4), affinity.translate(pergolas[0], cx-12, cy-20)]
        fountain = None
    elif kind == "muvozanat":
        play1 = blob(cx-11, cy+13, 9.5, 5.5, -35, 0.2, 2)
        play2 = blob(cx+11, cy-12, 8.0, 5.2, -35, 0.2, 5)
        conn = curve(bez((cx-22, cy-24), (cx-8, cy-2), (cx-1, cy+3)), 2.4)
        deck1 = blob(cx+15, cy+19, 5, 3.5, -35, 0.08, 3)
        play = unary_union([play1, play2]).intersection(inner)
        fountain = FOUNTAIN.buffer(0.5)          # mavjud favvora saqlanadi, atrofi 1 m plitka
        hard = unary_union([conn, deck1, fountain]).intersection(inner).difference(play)
        canopies = [Point(cx+15, cy+19).buffer(4.5), Point(cx+11, cy-11).buffer(4.5)]
        pergolas = [affinity.translate(affinity.rotate(Polygon([(-3,-2),(3,-2),(3,2),(-3,2)]), -35), cx-19, cy+2)]
    else:  # erkin — faqat uslub; kompozitsiya uchastkadan: favvora markaz, 8-shakl yoʻl (2-referens)
        play1 = blob(cx-12, cy+14, 9, 6, -20, 0.2, 7)
        conn = unary_union([curve(bez((cx-20, cy-22), (cx-16, cy+2), (cx-2, cy+8)), 2.4),
                            curve(bez((cx+4, cy+8), (cx+18, cy+2), (cx+14, cy-22)), 2.4)])
        fountain = FOUNTAIN.buffer(1.5)
        deck1 = blob(cx+13, cy+20, 5.5, 4, -20, 0.08, 3)
        play = play1.intersection(inner)
        hard = unary_union([conn, deck1, fountain]).intersection(inner).difference(play)
        canopies = [Point(cx+13, cy+20).buffer(4)]
        pergolas = []
    islands = inner.difference(unary_union([play, hard]))
    el.update(play=play, hard=hard, islands=islands, canopies=canopies, pergolas=pergolas, fountain=fountain)
    return el

def trees_for(islands, kind, seed=3):
    import random
    rnd = random.Random(seed)
    spacing = {"qatiy": 8.0, "muvozanat": 7.0, "erkin": 6.5}[kind]
    pts = []
    minx, miny, maxx, maxy = islands.bounds
    tries = 0
    while tries < 4000:
        tries += 1
        p = Point(rnd.uniform(minx, maxx), rnd.uniform(miny, maxy))
        if not islands.buffer(-1.6).contains(p):   # toj chetidan, yoʻlakdan ≥ 1,2 m (SanQvaN 74.2) — tanadan 1,6
            continue
        if any(p.distance(q) < spacing for q in pts):
            continue
        pts.append(p)
    return pts

def metrics(el, trees, kind):
    A = SITE.area
    green = el["islands"].area + el["edge"].area
    hard = el["loop"].area + el["hard"].area
    play = el["play"].area
    canopy_r20 = 4.5   # 20 yil toj radiusi — P (USDA UTD bilan hisoblanadi)
    can = unary_union([t.buffer(canopy_r20) for t in trees]).intersection(SITE).area if trees else 0
    bench_len = el["islands"].boundary.length * 0.25
    loop_len = el["loop"].area / {"qatiy": 4.5, "muvozanat": 2.4, "erkin": 2.4}[kind]
    return dict(A=A, green=green, hard=hard, play=play, green_pct=green/A*100, hard_pct=hard/A*100, play_pct=play/A*100,
                trees=len(trees), canopy_pct=can/A*100, loop_w={"qatiy": 4.5, "muvozanat": 2.4, "erkin": 2.4}[kind],
                loop_len=loop_len, cap=round(A/1e4*100), fountain=el["fountain"] is not None)

if __name__ == "__main__":
    out = {}
    for k in ("qatiy", "muvozanat", "erkin"):
        el = variant(k); tr = trees_for(el["islands"], k)
        m = metrics(el, tr, k); out[k] = m
        print(k, {a: (round(b, 1) if isinstance(b, float) else b) for a, b in m.items()})
    print("site m2", round(SITE.area), "round", round(R_SITE.area))
    # binoga masofa
    for n in ("b5", "bw1", "bw2", "bw3", "bN"):
        print(n, round(Polygon(CTX[n]).distance(SITE), 1))
    print("fountain area", round(FOUNTAIN.area), "centroid", FOUNTAIN.centroid)
