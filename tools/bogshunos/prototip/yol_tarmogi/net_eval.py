# Tizimli variant geometriyasi + barcha variantlar uchun tarmoq metrikalari
import json, math, copy
import networkx as nx
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from shapely import affinity
import test_tc as T, net_tc as N

OLD_GATES = [(3, 48), (31, 8), (0, -24), (-30, 16)]      # H-taxtadagi test kirishlari

def build_tizimli():
    ods_raw = N.od_pairs()
    ods = copy.deepcopy(ods_raw)
    gates = N.cluster_gates(ods)
    allowed = T.SITE.buffer(-0.3).difference(N.PLAZA.buffer(1.2))
    G = N.build_grid(allowed); N.route_bundled(G, ods)
    H, chains, ends = N.extract_network(G)
    chains = N.clean(chains, gates, N.PLAZA, add_ring=True)
    fmax = max(c["flow"] for c in chains)
    for c in chains:
        c["tier"], c["w"] = N.tier(c["flow"], fmax)
        if all(Point(p).distance(N.PLAZA.exterior) < 1.6 for p in c["xy"]): c["tier"], c["w"] = "halqa", 2.4
    paths = unary_union([LineString(c["xy"]).buffer(c["w"]/2, cap_style=1, join_style=1) for c in chains])
    plaza_band = N.PLAZA.buffer(1.2).difference(T.FOUNTAIN)              # favvora atrofi maydoncha (mavjud plitka)
    # darvoza cho'ntaklari (kirish maydonchasi, r = 3 m — P)
    pockets = unary_union([Point(g["p"]).buffer(3.0) for g in gates]).intersection(T.SITE)
    hard = unary_union([paths, plaza_band, pockets]).intersection(T.SITE)
    # hujayralar (yoʻllar orasidagi maydonlar)
    cells = T.SITE.difference(unary_union([hard, T.FOUNTAIN]))
    cells = sorted([g for g in getattr(cells, "geoms", [cells]) if g.area > 5], key=lambda g: -g.area)
    # faollik choʻntaklari (Alexander 124): halqa–radial tutashuvida, hujayra tomonga 3×4 m maydoncha (P)
    act = []
    for c in chains:
        if c["tier"] in ("asosiy", "ikkinchi"):
            ls = LineString(c["xy"])
            p_end = ls.coords[-1] if Point(ls.coords[-1]).distance(N.PLAZA) < 2 else ls.coords[0]
            mid = ls.interpolate(0.55, normalized=True)
            # radial boʻylab oʻrtada yon tomonga skameyka choʻntagi
            q = ls.interpolate(min(ls.length, ls.project(mid) + 1.0)); dx, dy = q.x - mid.x, q.y - mid.y
            nn = math.hypot(dx, dy) or 1; nx_, ny_ = -dy/nn, dx/nn
            off = c["w"]/2 + 1.5
            for sgn in (1,):
                ctr = Point(mid.x + sgn*nx_*off, mid.y + sgn*ny_*off)
                act.append(ctr.buffer(1.8, cap_style=3).buffer(0.6))
    act = unary_union(act).intersection(T.SITE).difference(T.FOUNTAIN)
    # bolalar maydonchasi: eng katta hujayra ichida, yoʻldan ≥ 2 m (P), maydoni ≈ Muvozanat bilan teng
    big = cells[0]
    core = big.buffer(-2.5)
    target = 115.0
    cxy = core.representative_point()
    best = None
    for r in [x/2 for x in range(8, 26)]:
        b = T.blob(cxy.x, cxy.y, r, r*0.65, -35, 0.2, 2).intersection(core)
        if b.area <= target: best = b
    play = best
    hard_all = unary_union([hard, act]).difference(play)
    green = T.SITE.difference(unary_union([hard_all, play, T.FOUNTAIN]))
    return dict(ods=ods, ods_raw=ods_raw, gates=gates, chains=chains, hard=hard_all, play=play, green=green,
                cells=cells, act=act, pockets=pockets, plaza=plaza_band)

def old_walk(kind):
    el = T.variant(kind)
    # kirish: darvozadan halqagacha toʻgʻri qisqa yoʻl (chet yashil polosasini kesib)
    st = []
    for g in OLD_GATES:
        q = el["loop"].boundary
        near = q.interpolate(q.project(Point(g)))
        st.append(LineString([g, (near.x, near.y)]).buffer(1.2, cap_style=2))
    walk = unary_union([el["loop"], el["hard"]] + st).intersection(T.SITE)
    green = el["islands"].area + el["edge"].area - unary_union(st).intersection(el["edge"]).area
    return walk, el, green

def metrics_for(walk, ods_raw, gates_open, fountain=True):
    ods = copy.deepcopy(ods_raw)
    res = N.eval_prd(walk, ods, gates_open)
    for r, od in zip(res, ods):
        a = N.ATTR[od["o"]][0]
        ent = od["p"][0]
        if od["kind"] == "manzil":
            full_straight = Point(a).distance(N.PLAZA)
            outer = math.dist(a, ent)
        else:
            b = N.ATTR[od["d"]][0]; ext = od["p"][1]
            full_straight = math.dist(a, b); outer = math.dist(a, ent) + math.dist(ext, b)
        r["inner_prd"] = r["prd"]
        r["connected"] = r["net"] < 1e5
        r["prd"] = (outer + r["net"]) / full_straight if r["connected"] else float("inf")
    tot = sum(r["f"] for r in res)
    good = sum(r["f"] for r in res if r["prd"] <= 1.3)
    con = [r for r in res if r["connected"]]
    wprd = sum(r["f"]*r["prd"] for r in con) / max(sum(r["f"] for r in con), 1e-9)
    risk = sum(r["f"] for r in res if r["prd"] > 1.3) / tot * 100
    return res, dict(prd_w=wprd, share_ok=good/tot*100, prd_max=max(r["prd"] for r in con),
                     unconnected=sum(r["f"] for r in res if not r["connected"]) / tot * 100, risk=risk)

if __name__ == "__main__":
    tz = build_tizimli()
    A = T.SITE.area
    walk_tz = unary_union([tz["hard"]]).buffer(0)
    res_tz, m_tz = metrics_for(walk_tz, tz["ods_raw"], [g["p"] for g in tz["gates"]])
    topo = N.topo(tz["chains"], tz["gates"], perimeter=True)
    out = {"tizimli": dict(green_pct=tz["green"].area/A*100, hard_pct=tz["hard"].area/A*100, play=tz["play"].area,
                           gates=len(tz["gates"]), **m_tz, **topo,
                           path_len=sum(LineString(c["xy"]).length for c in tz["chains"]))}
    for k in ("qatiy", "muvozanat", "erkin"):
        walk, el, green = old_walk(k)
        res, m = metrics_for(walk, tz["ods_raw"], OLD_GATES)
        out[k] = dict(green_pct=green/A*100, gates=4, **m)
        out[k]["res"] = [(r["o"][:14], r["d"][:14], round(r["prd"], 2)) for r in res]
    out["tizimli"]["res"] = [(r["o"][:14], r["d"][:14], round(r["prd"], 2)) for r in res_tz]
    for k, v in out.items():
        print(k, {a: (round(b, 2) if isinstance(b, float) else b) for a, b in v.items() if a != "res"})
    for i in range(len(out["tizimli"]["res"])):
        print(out["tizimli"]["res"][i], [out[k]["res"][i][2] for k in ("qatiy", "muvozanat", "erkin")])
    json.dump({k: {a: b for a, b in v.items()} for k, v in out.items()}, open("net_metrics.json", "w"), ensure_ascii=False, indent=1)
