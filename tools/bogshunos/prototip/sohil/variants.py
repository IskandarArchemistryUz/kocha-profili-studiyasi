# Test J variantlari va metrikalari
import math, pickle, copy
import numpy as np
import networkx as nx
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union, substring
from shapely.prepared import prep
import bsite as S, bank_net as B

A_SITE = S.SITE.area
W_PROM, W_BIKE, SEP = 4.0, 2.5, 0.5          # promenada 4,0 (P); velo 2,5 (≥ 1,5 — ShNQ 2.07.01-23, 404-b.); ajratish ≥ 0,5 (403-b.)

def band(line, d0, d1):
    """chiziqdan quruqlik tomonga d0..d1 m polosa."""
    outer = line.buffer(d1, cap_style=2, join_style=1)
    inner = line.buffer(d0, cap_style=2, join_style=1) if d0 > 0 else None
    b = outer if inner is None else outer.difference(inner)
    return b.intersection(S.SITE).difference(S.WATER.buffer(0.3))

def offset_inland(line, d):
    best = None
    for side in ("left", "right"):
        try: l = line.parallel_offset(d, side, join_style=2)
        except Exception: continue
        ls = max(getattr(l, "geoms", [l]), key=lambda g: g.length)
        sc = ls.intersection(S.SITE.buffer(-0.5)).length
        if best is None or sc > best[0]: best = (sc, ls)
    return best[1]

def meander(line, amp=2.0, lam=70.0):
    n = int(line.length / 2)
    pts = []
    for i in range(n + 1):
        s = line.length * i / n
        p = line.interpolate(s); q = line.interpolate(min(line.length, s + 1)); r = line.interpolate(max(0, s - 1))
        dx, dy = q.x - r.x, q.y - r.y; L = math.hypot(dx, dy) or 1
        o = amp * math.sin(2 * math.pi * s / lam)
        pts.append((p.x - dy / L * o, p.y + dx / L * o))
    return LineString(pts)

# ---------------- Qatʼiy: referensdagi polosalar butun sohil boʻylab ----------------
def qatiy():
    sh = B.SHORE
    prom = band(sh, 0, 5.0)
    bike_ax = meander(offset_inland(sh, 7.0), 1.5, 80)
    bike = bike_ax.buffer(1.5, cap_style=2).intersection(S.SITE)           # 3,0 m (referensdagi qizil polosa)
    trees = band(sh, 8.5, 12.5)                                            # daraxt + maysa polosasi
    walk_ax = meander(offset_inland(sh, 15.0), 2.5, 70)
    walk = walk_ax.buffer(2.5, cap_style=2).intersection(S.SITE)           # 5 m yurish yoʻli
    terr = band(sh, 17.5, 27.5)                                            # yogʻoch terrasalar butun uzunlik
    # darvozalardan polosaga toʻgʻri tushish (nishab chizigʻi boʻylab)
    stairs = []
    for k, (p, w) in S.ATTR.items():
        q = walk_ax.interpolate(walk_ax.project(Point(p)))
        stairs.append(LineString([p, (q.x, q.y)]))
    # polosalar orasida koʻndalang oʻtishlar har ~50 m (referensdagi kabi; P)
    for s_ in np.arange(25, sh.length, 50):
        p = sh.interpolate(s_); q = walk_ax.interpolate(walk_ax.project(p))
        stairs.append(LineString([(p.x, p.y), (q.x, q.y)]))
    st = unary_union([l.buffer(1.5, cap_style=2) for l in stairs]).intersection(S.SITE)
    hard_ped = unary_union([prom, walk, st, terr])
    hard = unary_union([hard_ped, bike])
    return dict(name="Qatʼiy", prom=prom, bike=bike, bike_ax=bike_ax, trees=trees, walk=walk, terr=terr, conn=st,
                hard=hard, ped=hard_ped, axes=[walk_ax] + stairs, prom_ax=offset_inland(sh, 2.5))

# ---------------- Tizimli: oqim → tarmoq, referens uslubi faqat sigʻgan joyda ----------------
def tizimli():
    ods, ch = pickle.load(open("/home/claude/gen/j/tz.pkl", "rb"))
    fmax = max(c["flow"] for c in ch)
    walk = unary_union([LineString(c["xy"]).buffer(c["w"] / 2, cap_style=1, join_style=1) for c in ch]).intersection(S.SITE)
    prom_ax = B.PROM
    prom = prom_ax.buffer(W_PROM / 2, cap_style=2).intersection(S.SITE).difference(S.WATER.buffer(0.3))
    # velo: A — sohil boʻyi (promenadadan 0,5 m ajratib), B — ichki xiyobon; kam daraxt kesadigani tanlanadi
    bike_ax_A = offset_inland(prom_ax, W_PROM / 2 + SEP + W_BIKE / 2)
    bike_A = bike_ax_A.buffer(W_BIKE / 2, cap_style=2).intersection(S.SITE)
    spine = max(ods, key=lambda o: (o["kind"] == "tranzit") * math.dist(o["a"], o["b"] or o["a"]))
    bike_ax_B = LineString(B.chaikin(list(LineString(spine["path"]).simplify(2.5).coords)))
    bike_B = bike_ax_B.buffer(W_BIKE / 2, cap_style=2).intersection(S.SITE)
    lossA = bike_A.intersection(S.WOOD).area; lossB = bike_B.difference(walk).intersection(S.WOOD).area
    # B varianti piyoda xiyoboni ustiga tushadi (403-b. ajratish buziladi) — shuning uchun sohil (A) tanlanadi
    bike, bike_ax, bike_opt = bike_A, bike_ax_A, "sohil"
    # terrasalar: promenada boʻyida ochiq polosa eng keng joylarda (2 ta), 22 m uzun
    open_ = S.SITE.difference(S.WOOD)
    cands = []
    L = prom_ax.length
    for s in np.arange(20, L - 20, 5):
        p = prom_ax.interpolate(s); q = prom_ax.interpolate(s + 1)
        dx, dy = q.x - p.x, q.y - p.y; n = math.hypot(dx, dy) or 1
        for sg in (1, -1):
            ray = LineString([(p.x, p.y), (p.x - sg * dy / n * 40, p.y + sg * dx / n * 40)])
            if ray.interpolate(10).within(S.SITE) and ray.interpolate(10).distance(S.WATER) > 5:
                seg = ray.intersection(open_)
                w = seg.geoms[0].length if hasattr(seg, "geoms") else seg.length
                z0, z1 = S.Z(p.x, p.y), S.Z(*ray.interpolate(min(w, 20)).coords[0])
                cands.append((w, s, sg, z1 - z0))
    cands.sort(reverse=True)
    terr_s = []
    for w, s, sg, dz in cands:
        if all(abs(s - t[1]) > 120 for t in terr_s): terr_s.append((w, s, sg, dz))
        if len(terr_s) == 2: break
    terr = []
    for w, s, sg, dz in terr_s:
        seg = substring(prom_ax, max(0, s - 11), min(L, s + 11))
        depth = min(10.0, w - W_PROM / 2 - 2)
        t = offset_inland(seg, W_PROM / 2 + depth / 2) if False else None
        poly = seg.buffer(W_PROM / 2 + depth, single_sided=False, cap_style=2).difference(seg.buffer(W_PROM / 2, cap_style=2))
        poly = poly.intersection(open_).difference(S.WATER.buffer(0.3))
        poly = max(getattr(poly, "geoms", [poly]), key=lambda g: g.area)
        terr.append(dict(poly=poly, s=s, depth=depth, dz=dz))
    terr_u = unary_union([t["poly"] for t in terr]).difference(bike)
    # oʻyin maydoni: 1-ochiq maysazor (Koʻrgazma tomonda dumaloq) ichida — yoʻldan ≥ 2,5 m (P)
    cells = open_.difference(unary_union([walk, prom, bike, terr_u]).buffer(2.5))
    cells = sorted([c for c in getattr(cells, "geoms", [cells]) if c.area > 50], key=lambda c: -c.area)
    from shapely.ops import polylabel
    pl = polylabel(cells[0].buffer(0), 0.5)
    play = Point(pl).buffer(min(8.0, cells[0].exterior.distance(pl) - 0.5)).intersection(cells[0])
    ped = unary_union([walk, prom, terr_u])
    hard = unary_union([ped, bike, play])
    axes = [LineString(c["xy"]) for c in ch]
    return dict(name="Tizimli", walk=walk, prom=prom, bike=bike, bike_ax=bike_ax, bike_opt=bike_opt, lossA=lossA, lossB=lossB,
                terr=terr_u, terr_info=terr, play=play, hard=hard, ped=ped, axes=axes, prom_ax=prom_ax, chains=ch, ods=ods)

# ---------------- Metrikalar ----------------
def access_eval(ped, ods):
    G = nx.Graph()
    step = 1.5
    pa = prep(ped.buffer(0.01))
    minx, miny, maxx, maxy = ped.bounds
    ok = {}
    for i in range(int((maxx - minx) / step) + 2):
        for j in range(int((maxy - miny) / step) + 2):
            x, y = minx + i * step, miny + j * step
            if pa.contains(Point(x, y)): ok[(i, j)] = (x, y)
    for (i, j), p in ok.items():
        for di, dj in B.MOVES:
            q = (i + di, j + dj)
            if q in ok and (i, j) < q:
                if (abs(di) == 2 or abs(dj) == 2) and not pa.contains(LineString([p, ok[q]])): continue
                G.add_edge((i, j), q, w=math.dist(p, ok[q]))
    for n in G.nodes: G.nodes[n]["xy"] = ok[n]
    comp = max(nx.connected_components(G), key=len); G = G.subgraph(comp).copy()
    xy = {n: G.nodes[n]["xy"] for n in G.nodes}
    def near(p):
        n = min(xy, key=lambda k: math.dist(xy[k], p)); return n, math.dist(xy[n], p)
    shore_t = [n for n in G.nodes if Point(xy[n]).distance(B.SHORE) < 6]
    res = []
    for od in ods:
        sa, da = near(od["a"])
        dist = nx.single_source_dijkstra_path_length(G, sa, weight="w")
        if od["kind"] == "manzil":
            d = min((dist.get(n, 1e9) for n in shore_t), default=1e9)
            straight = Point(od["a"]).distance(B.SHORE); db = 0
        else:
            sb, db = near(od["b"]); d = dist.get(sb, 1e9); straight = math.dist(od["a"], od["b"])
        conn = d < 1e8 and da < 15 and db < 15
        res.append(dict(o=od["o"], d=od["d"], f=od["f"], prd=(d + da + db) / max(straight, 1) if conn else float("inf"),
                        conn=conn, gap=max(da, db)))
    tot = sum(r["f"] for r in res); con = [r for r in res if r["conn"]]
    return res, dict(prd_w=sum(r["f"] * r["prd"] for r in con) / max(sum(r["f"] for r in con), 1e-9),
                     share_ok=sum(r["f"] for r in res if r["prd"] <= 1.3) / tot * 100,
                     uncon=sum(r["f"] for r in res if not r["conn"]) / tot * 100)

def slope_stats(axes):
    tot = ok5 = ok6 = 0; worst = 0
    for ax in axes:
        for L, g in B.slope_profile(ax):
            tot += L; ok5 += L * (g <= B.SLOPE_MAX); ok6 += L * (g <= B.SLOPE_SIDEWALK); worst = max(worst, g)
    return dict(len=tot, ok5=ok5 / tot * 100, ok6=ok6 / tot * 100, worst=worst * 100)

def metrics(v):
    hard = v["hard"]
    green = A_SITE - hard.area
    wood_lost = hard.intersection(S.WOOD).area
    # tashqi trotuar: Koʻrgazma koʻchasi boʻyi (ikkala variantga bir xil; R4)
    kor = unary_union([l for k, n, l in S.ROADS if "Ko'rgazma" in n] + [l for l in S.FOOT if l.distance(Point(-100, -84)) < 30])
    stubs = []
    for k, (p, w) in S.ATTR.items():
        q = v["ped"].boundary.interpolate(v["ped"].boundary.project(Point(p)))
        stubs.append(LineString([p, (q.x, q.y)]).buffer(1.2))
        from shapely.ops import nearest_points
        k_ = nearest_points(kor, Point(p))[0]
        if k_.distance(Point(p)) < 20: stubs.append(LineString([p, (k_.x, k_.y)]).buffer(1.2))
    v["stubs"] = unary_union(stubs)
    res, acc = access_eval(unary_union([v["ped"], kor.buffer(1.5), v["stubs"]]), B.od_pairs())
    sl = slope_stats(v["axes"])
    # velo bilan piyoda yoʻl kesishmalari (oʻtish joylari) va parallel ajratish buzilishi
    X = v["bike_ax"].intersection(unary_union(v["axes"]))
    crossings = len(getattr(X, "geoms", [X])) if not X.is_empty else 0
    par = v["bike"].intersection(v["prom"].buffer(SEP - 0.05)).area
    bike_sep_bad = par
    bike_wood = v["bike"].intersection(S.WOOD.buffer(0.75)).area
    return dict(green=green / A_SITE * 100, hard=hard.area, wood_kept=(1 - wood_lost / S.WOOD.area) * 100, wood_lost=wood_lost,
                **acc, slope_ok5=sl["ok5"], slope_ok6=sl["ok6"], slope_worst=sl["worst"], bike_len=v["bike_ax"].intersection(S.SITE).length,
                bike_conflict=bike_sep_bad, crossings=crossings, bike_wood=bike_wood, terr=v["terr"].area, res=res)

if __name__ == "__main__":
    out = {}
    for f in (qatiy, tizimli):
        v = f(); m = metrics(v); out[v["name"]] = (v, m)
        print(v["name"], {k: (round(x, 1) if isinstance(x, float) else x) for k, x in m.items() if k != "res"})
        for r in m["res"]: print("   ", r["o"][:16], "→", r["d"][:16], round(r["prd"], 2), round(r["gap"], 1))
        if v["name"] == "Tizimli": print(" bike", v["bike_opt"], round(v["lossA"]), round(v["lossB"]), [(round(t["depth"],1), round(t["dz"],1)) for t in v["terr_info"]])
    pickle.dump(out, open("/home/claude/gen/j/variants.pkl", "wb"))
