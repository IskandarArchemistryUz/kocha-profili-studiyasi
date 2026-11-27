# Test J — sohil boʻyi: «Qatʼiy» (referens nusxasi) va «Tizimli» (oqim → tarmoq) variantlari
import math, json, copy
import numpy as np
import networkx as nx
from shapely.geometry import Polygon, LineString, Point, MultiPoint
from shapely.ops import unary_union, polylabel, substring, linemerge
from shapely.prepared import prep
import bsite as S

SITE, WOOD, WATER = S.SITE, S.WOOD, S.WATER
OPEN = SITE.difference(WOOD)
EXIST = unary_union([l.intersection(SITE) for k, n, l in S.ROADS if k == "hi:service"] +
                    [l.intersection(SITE) for l in S.FOOT])                 # mavjud xiyobon va yoʻlaklar
SLOPE_MAX = 0.05            # ShNQ 2.07.02-24 (MGN yoʻllari, boʻylama) — §6.2
SLOPE_SIDEWALK = 0.06       # ShNQ 2.07.01-23, 346-b. (trotuar boʻylama ≤ 60 ‰)

# ---------- 1. Sohil chizigʻi va koʻrinish nuqtalari ----------
def shore_line():
    # suv chetidan 1 m ichkarida, uchastka ichidagi eng uzun chiziq
    ring = SITE.exterior
    pts = [Point(c) for c in ring.coords]
    near = [p.distance(WATER) < 1.5 for p in pts]
    best, cur = [], []
    for p, n in zip(pts + pts, near + near):
        if n: cur.append(p.coords[0])
        else:
            if len(cur) > len(best): best = cur
            cur = []
    return LineString(best)
SHORE = shore_line()

def promenade_line(off=4.5):
    """Sohil promenadasi oʻqi — suv chetidan off m ichkarida (referens: parapet boʻyi yoʻli)."""
    best = None
    for side in ("left", "right"):
        try:
            l = SHORE.parallel_offset(off, side, join_style=2)
        except Exception:
            continue
        ls = max(getattr(l, "geoms", [l]), key=lambda g: g.length)
        inside = ls.intersection(SITE.buffer(-1))
        if best is None or inside.length > best.length: best = inside
    best = linemerge(best) if best.geom_type == "MultiLineString" else best
    return max(getattr(best, "geoms", [best]), key=lambda g: g.length)
PROM = promenade_line()
EXIST_ALL = unary_union([EXIST, PROM])

def view_points(step=35):
    L = SHORE.length
    return [SHORE.interpolate(s) for s in np.arange(15, L - 10, step)]

# ---------- 2. OD ----------
def od_pairs():
    keys = list(S.ATTR); out = []
    for i in range(len(keys)):
        a, wa = S.ATTR[keys[i]]
        for j in range(i + 1, len(keys)):
            b, wb = S.ATTR[keys[j]]
            d = math.dist(a, b)
            if d > 70:
                out.append(dict(o=keys[i], d=keys[j], a=a, b=b, f=wa * wb / d * 100, kind="tranzit"))
        # manzil: suv boʻyiga (eng yaqin koʻrinish nuqtasi), vazn 2,0 (P)
        d = Point(a).distance(SHORE)
        out.append(dict(o=keys[i], d="Suv boʻyi", a=a, b=None, f=wa * 2.0 / max(d, 20) * 100, kind="manzil"))
    return out

# ---------- 3. Setka: qiyalik va daraxtzor narxi ----------
STEP = 2.0
MOVES = [(1,0),(0,1),(-1,0),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1),(2,1),(1,2),(-1,2),(-2,1),(-2,-1),(-1,-2),(1,-2),(2,-1)]
def build_grid(allowed, step=STEP):
    minx, miny, maxx, maxy = allowed.bounds
    pa = prep(allowed); pw = prep(WOOD.buffer(-1.0)); pe = prep(EXIST_ALL.buffer(2.0))
    ok = {}
    for i in range(int((maxx - minx) / step) + 2):
        for j in range(int((maxy - miny) / step) + 2):
            x, y = minx + i * step, miny + j * step
            p = Point(x, y)
            if pa.contains(p):
                ok[(i, j)] = (x, y, S.Z(x, y), pw.contains(p), pe.contains(p))
    G = nx.Graph()
    for (i, j), p in ok.items():
        for di, dj in MOVES:
            q = (i + di, j + dj)
            if q in ok and (i, j) < q:
                r = ok[q]; L = math.dist(p[:2], r[:2]); g = abs(p[2] - r[2]) / L
                wood = (p[3] or r[3]) and not (p[4] and r[4])
                G.add_edge((i, j), q, w=L, g=g, wood=wood, exist=(p[4] and r[4]))
    for n in G.nodes: G.nodes[n]["xy"] = ok[n][:2]; G.nodes[n]["z"] = ok[n][2]
    return G

def cost_fn(beta=0.5, wood_k=4.0, slope_k=25.0):
    def c(u, v, d):
        k = 1.0
        if d["wood"]: k *= wood_k                                  # mavjud daraxtzorni saqlash
        if d["g"] > SLOPE_MAX: k *= 1 + slope_k * (d["g"] - SLOPE_MAX)   # nishab chizigʻi boʻylab emas (Auckland DM)
        if d.get("flow", 0) > 0 or d["exist"] or d.get("seed"): k *= (1 - beta)    # bundling + mavjud yoʻl
        return d["w"] * k
    return c

def snap(G, p):
    return min(G.nodes, key=lambda n: math.dist(G.nodes[n]["xy"], p))

WOOD_K = 1.0
def route(G, ods, passes=2):
    for _ in range(passes):
        _route1(G, ods)
    return G

def _route1(G, ods):
    prev = {(u, v): d.get("flow", 0) for u, v, d in G.edges(data=True)}
    for u, v in G.edges: G[u][v]["flow"] = 0.0
    for (u, v), f in prev.items():
        if f > 0: G[u][v]["seed"] = True
    shore_nodes = [n for n in G.nodes if Point(G.nodes[n]["xy"]).distance(SHORE) < 3.0]
    c = cost_fn(beta=0.65, wood_k=WOOD_K)
    for od in sorted(ods, key=lambda z: -z["f"]):
        s = snap(G, od["a"])
        dist, paths = nx.single_source_dijkstra(G, s, weight=c)
        if od["kind"] == "manzil":
            t = min(shore_nodes, key=lambda n: dist.get(n, 1e9))
        else:
            t = snap(G, od["b"])
        path = paths[t]
        for u, v in zip(path, path[1:]): G[u][v]["flow"] += od["f"]
        od["path"] = [G.nodes[n]["xy"] for n in path]
    return G

def chaikin(pts, it=2):
    for _ in range(it):
        if len(pts) < 3: return pts
        q = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            q += [(0.75*a[0]+0.25*b[0], 0.75*a[1]+0.25*b[1]), (0.25*a[0]+0.75*b[0], 0.25*a[1]+0.75*b[1])]
        q.append(pts[-1]); pts = q
    return pts

def chains_of(G, min_flow=1e-3):
    H = nx.Graph()
    for u, v, d in G.edges(data=True):
        if d["flow"] > min_flow: H.add_edge(u, v, flow=d["flow"])
    ends = {n for n in H.nodes if H.degree(n) != 2}
    seen = set(); out = []
    for s in ends:
        for nb in H.neighbors(s):
            if (s, nb) in seen: continue
            ch = [s, nb]; seen |= {(s, nb), (nb, s)}
            while ch[-1] not in ends:
                nx_ = [m for m in H.neighbors(ch[-1]) if m != ch[-2]][0]
                seen |= {(ch[-1], nx_), (nx_, ch[-1])}; ch.append(nx_)
            fl = max(H[a][b]["flow"] for a, b in zip(ch, ch[1:]))
            xy = [G.nodes[n]["xy"] for n in ch]
            out.append(dict(xy=chaikin(list(LineString(xy).simplify(2.5).coords)), flow=fl, a=ch[0], b=ch[-1]))
    # qisqa osilgan uchlarni olib tashlash
    gp = [p for p, w in S.ATTR.values()]
    def anchored(p): return any(math.dist(p, g) < 16 for g in gp) or Point(p).distance(SHORE) < 4
    while True:
        deg = {}
        for c in out:
            for k in ("a", "b"): deg[c[k]] = deg.get(c[k], 0) + 1
        drop = [c for c in out if LineString(c["xy"]).length < 10 and
                ((deg[c["a"]] == 1 and not anchored(c["xy"][0])) or (deg[c["b"]] == 1 and not anchored(c["xy"][-1])))]
        if not drop: break
        for c in drop: out.remove(c)
    return out

def tier(fl, fmax):
    r = fl / fmax
    return ("asosiy", 3.0) if r >= 0.45 else (("ikkinchi", 2.4) if r >= 0.15 else ("uchinchi", 2.0))

def slope_profile(ls, step=2.0):
    """chiziq boʻylab nishablar (SRTM — P)."""
    out = []
    n = max(2, int(ls.length / step))
    pts = [ls.interpolate(i / n, normalized=True) for i in range(n + 1)]
    for a, b in zip(pts, pts[1:]):
        L = a.distance(b)
        if L > 0: out.append((L, abs(S.Z(a.x, a.y) - S.Z(b.x, b.y)) / L))
    return out
