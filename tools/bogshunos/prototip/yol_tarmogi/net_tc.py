# Bogʻshunos — «Yoʻl tarmogʻi: yaxlit tizim» testi (Tashkent City, 0,44 ga)
# 1) manba-maqsad (OD) → 2) xohish chiziqlari → 3) birlashtirish (bundling) → 4) ierarxiya
# 5) tugunlar = joylar → 6) metrikalar (PRD, link-node, CNR, gamma, alpha, boshi berk, qamrov)
# Koordinatalar: metr, markaz 41.31337 N, 69.25197 E (x sharq, y shimol). Tashqi nuqtalar — OSM Overpass, 14.11.2026.
import math, heapq, json
import networkx as nx
from shapely.geometry import Polygon, Point, LineString, MultiLineString
from shapely.ops import unary_union, nearest_points
import test_tc as T

SITE = T.SITE
FOUNT = T.FOUNTAIN
PLAZA = FOUNT.buffer(2.4, join_style=1)            # favvora atrofi halqa (mavjud OSM footway halqasi ~2–6 m)

# ---- 1. Tashqi jalb nuqtalari (OSM) va vaznlar (P — sanoq bilan tekshirilsin) ----
ATTR = {
 "Oʻzbekiston metrosi (kirish)": ((104, -63), 5.0),     # subway_entrance + steps
 "Paxtakor/Uqchi chorrahasi":   ((150, 115), 3.0),      # crossing ×3
 "Hotel (shimol)":              ((30, 140), 2.0),
 "5 qavatli bino (sharq)":      ((46, 5), 2.0),
 "Nest One (janub)":            ((0, -105), 3.0),
 "Opera teatri":                ((-125, -60), 1.5),
 "Yangi Toshkent oʻtish (j.)":  ((-99, -24), 2.0),      # crossing
 "Yangi Toshkent oʻtish (sh.)": ((-87, 102), 1.5),      # crossing
 "Gʻarbiy bino/parking":        ((-50, 30), 1.0),
}
INNER = {"Favvora": (1.4, 12.7)}                        # ichki maqsad (Alexander 126 «oʻrtada nimadir»)
W_FOUNT = 2.0                                           # P

def entry_point(a, b):
    """a→b toʻgʻri chiziq uchastka chegarasini kesgan joylar (kirish/chiqish)."""
    ln = LineString([a, b]); x = ln.intersection(SITE.exterior)
    pts = [x] if x.geom_type == "Point" else list(getattr(x, "geoms", []))
    pts = [p for p in pts if p.geom_type == "Point"]
    pts.sort(key=lambda p: Point(a).distance(p))
    return pts

def od_pairs():
    """Gravitatsiya: f = wa·wb / d (P). Faqat toʻgʻri chiziq uchastkani kesib oʻtsa — tranzit;
       har bir tashqi nuqta ↔ favvora — manzil oqimi."""
    keys = list(ATTR); out = []
    for i in range(len(keys)):
        for j in range(i+1, len(keys)):
            (a, wa), (b, wb) = ATTR[keys[i]], ATTR[keys[j]]
            e = entry_point(a, b)
            if len(e) >= 2 and e[0].distance(e[-1]) > 12:
                d = Point(a).distance(Point(b))
                out.append(dict(o=keys[i], d=keys[j], p=(e[0].coords[0], e[-1].coords[0]), f=wa*wb/d*100, kind="tranzit"))
        a, wa = ATTR[keys[i]]
        e = LineString([a, INNER["Favvora"]]).intersection(SITE.exterior)
        e = e if e.geom_type == "Point" else min(e.geoms, key=lambda p: Point(a).distance(p))
        d = Point(a).distance(Point(INNER["Favvora"]))
        out.append(dict(o=keys[i], d="Favvora", p=(e.coords[0], INNER["Favvora"]), f=wa*W_FOUNT/d*100, kind="manzil"))
    return out

# ---- 2. Kirishlarni birlashtirish (chegarada ≤ 10 m — bitta darvoza) ----
def cluster_gates(ods, tol=14.0, min_share=0.06):
    ring = SITE.exterior; L = ring.length
    pts = []
    for od in ods:
        for k, p in enumerate(od["p"]):
            if Point(p).distance(ring) < 0.01:
                pts.append((ring.project(Point(p)), od["f"], od, k))
    pts.sort(key=lambda z: z[0])
    groups = []
    for s, f, od, k in pts:
        if groups and (s - groups[-1][-1][0]) <= tol: groups[-1].append((s, f, od, k))
        else: groups.append([(s, f, od, k)])
    if len(groups) > 1 and (groups[0][0][0] + L - groups[-1][-1][0]) <= tol:   # halqa boshi-oxiri
        groups[0] = groups[-1] + groups[0]; groups.pop()
    # kichik darvozalar qoʻshnisiga qoʻshiladi (Auckland DM: yoʻllar sonini ratsionallashtirish)
    tot = sum(f for g in groups for _, f, _, _ in g)
    changed = True
    while changed and len(groups) > 2:
        changed = False
        ws = [sum(f for _, f, _, _ in g) for g in groups]
        i = min(range(len(groups)), key=lambda k: ws[k])
        if ws[i] / tot < min_share:
            c = lambda g: g[len(g)//2][0]
            j = min((k for k in range(len(groups)) if k != i),
                    key=lambda k: min(abs(c(groups[k]) - c(groups[i])), L - abs(c(groups[k]) - c(groups[i]))))
            groups[j] = groups[j] + groups[i] if j < i else groups[i] + groups[j]
            groups.pop(i); changed = True
    gates = []
    for g in groups:
        ws = sum(f for _, f, _, _ in g)
        # vaznli oʻrtacha chegara boʻyicha (halqa uzilishini hisobga olib)
        base = g[0][0]
        s = sum(((x - base) % L) * f for x, f, _, _ in g) / ws + base
        gp = ring.interpolate(s % L)
        gates.append(dict(p=(gp.x, gp.y), f=ws))
        for _, _, od, k in g:
            pl = list(od["p"]); pl[k] = (gp.x, gp.y); od["p"] = tuple(pl)
    return gates

# ---- 3. Marshrutlash setkasi (1,5 m, 16 qoʻshni) ----
STEP = 1.5
MOVES = [(1,0),(0,1),(-1,0),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1),(2,1),(1,2),(-1,2),(-2,1),(-2,-1),(-1,-2),(1,-2),(2,-1)]

def build_grid(allowed, step=STEP, moves=MOVES):
    minx, miny, maxx, maxy = allowed.bounds
    from shapely.prepared import prep
    pa = prep(allowed); G = nx.Graph()
    nxs = int((maxx-minx)/step)+2; nys = int((maxy-miny)/step)+2
    ok = {}
    for i in range(nxs):
        for j in range(nys):
            x, y = minx + i*step, miny + j*step
            if pa.contains(Point(x, y)): ok[(i, j)] = (x, y)
    for (i, j), p in ok.items():
        for di, dj in moves:
            q = (i+di, j+dj)
            if q in ok and (i, j) < q:
                if abs(di) == 2 or abs(dj) == 2:   # ritsar yurishi — oʻrta nuqtalar ham ichkarida
                    if not pa.contains(LineString([p, ok[q]])): continue
                G.add_edge((i, j), q, w=math.dist(p, ok[q]))
    for n in G.nodes: G.nodes[n]["xy"] = ok[n]
    return G

def snap(G, p):
    return min(G.nodes, key=lambda n: math.dist(G.nodes[n]["xy"], p))

def route_bundled(G, ods, beta=0.5):
    """Xohish chiziqlarini oqim kamayish tartibida yotqizamiz; ishlatilgan qirra arzonlashadi → birlashadi."""
    for u, v in G.edges: G[u][v]["flow"] = 0.0
    # favvora halqasi — oldindan mavjud yoʻl (OSM footway halqa): grafga alohida chiziq sifatida
    ring = PLAZA.exterior; L = ring.length; n = int(L)
    rn = [("R", k) for k in range(n)]
    for k in range(n):
        G.add_node(rn[k], xy=ring.interpolate(L*k/n).coords[0])
    for k in range(n):
        G.add_edge(rn[k], rn[(k+1) % n], w=L/n, flow=1e-6, ring=True)
    grid = [m for m in G.nodes if m[0] != "R"]
    for k in range(n):
        p = G.nodes[rn[k]]["xy"]
        for m in grid:
            d = math.dist(p, G.nodes[m]["xy"])
            if d < 1.6: G.add_edge(rn[k], m, w=d, flow=0.0)
    plaza_nodes = rn
    for od in sorted(ods, key=lambda z: -z["f"]):
        s = snap(G, od["p"][0])
        if od["kind"] == "manzil":
            tgt = set(plaza_nodes)
        else:
            tgt = {snap(G, od["p"][1])}
        def cost(u, v, d): return d["w"] * (1 - beta if (d["flow"] > 0) else 1.0)
        best = None
        dist, paths = nx.single_source_dijkstra(G, s, weight=cost)
        t = min(tgt, key=lambda n: dist.get(n, 1e9))
        path = paths[t]
        for u, v in zip(path, path[1:]): G[u][v]["flow"] += od["f"]
        od["path"] = [G.nodes[n]["xy"] for n in path]
    return G

# ---- 4. Tarmoqni chiziqqa aylantirish, silliqlash ----
def chaikin(pts, it=2):
    for _ in range(it):
        if len(pts) < 3: return pts
        q = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            q += [(0.75*a[0]+0.25*b[0], 0.75*a[1]+0.25*b[1]), (0.25*a[0]+0.75*b[0], 0.25*a[1]+0.75*b[1])]
        q.append(pts[-1]); pts = q
    return pts

def extract_network(G):
    H = nx.Graph()
    for u, v, d in G.edges(data=True):
        if d["flow"] > 1e-3 and not d.get("ring"): H.add_edge(u, v, flow=d["flow"])
    # degree-2 zanjirlarni bitta chiziqqa
    ends = {n for n in H.nodes if H.degree(n) != 2}
    seen = set(); chains = []
    for s in ends:
        for nb in H.neighbors(s):
            if (s, nb) in seen: continue
            ch = [s, nb]; seen |= {(s, nb), (nb, s)}
            while ch[-1] not in ends:
                nxt = [m for m in H.neighbors(ch[-1]) if m != ch[-2]][0]
                seen |= {(ch[-1], nxt), (nxt, ch[-1])}; ch.append(nxt)
            fl = max(H[a][b]["flow"] for a, b in zip(ch, ch[1:]))
            xy = [G.nodes[n]["xy"] for n in ch]
            ls = LineString(xy).simplify(2.0)
            chains.append(dict(xy=chaikin(list(ls.coords)), flow=fl, a=ch[0], b=ch[-1]))
    return H, chains, ends

def clean(chains, gates, plaza, min_len=6.0, add_ring=False):
    """Darvozaga yoki halqaga olib bormaydigan qisqa uchlarni olib tashlash; halqani tarmoqqa qoʻshish."""
    gpts = [g["p"] for g in gates]
    def anchored(p):
        return any(math.dist(p, g) < 2.5 for g in gpts) or Point(p).distance(plaza.exterior) < 2.0
    while True:
        deg = {}
        for c in chains:
            for k in ("a", "b"): deg[c[k]] = deg.get(c[k], 0) + 1
        drop = [c for c in chains if LineString(c["xy"]).length < min_len and
                ((deg[c["a"]] == 1 and not anchored(c["xy"][0])) or (deg[c["b"]] == 1 and not anchored(c["xy"][-1])))]
        if not drop: break
        for c in drop: chains.remove(c)
    # halqaga ulanish nuqtalari
    ring = plaza.exterior; att = []
    for c in chains:
        for k, idx in (("a", 0), ("b", -1)):
            p = c["xy"][idx]
            if Point(p).distance(ring) < 2.0:
                s_ = ring.project(Point(p)); q = ring.interpolate(s_)
                pl = list(c["xy"]); pl[idx] = (q.x, q.y); c["xy"] = pl
                c[k] = ("R", round(s_, 1)); att.append(round(s_, 1))
    if not add_ring: return chains
    att = sorted(set(att)); L = ring.length
    fmin = min(c["flow"] for c in chains)
    for i, s0 in enumerate(att):
        s1 = att[(i+1) % len(att)]
        if s1 <= s0: s1 += L
        n = max(4, int((s1 - s0) / 1.0))
        xy = [ring.interpolate((s0 + (s1 - s0)*t/n) % L).coords[0] for t in range(n+1)]
        chains.append(dict(xy=xy, flow=fmin, a=("R", s0), b=("R", att[(i+1) % len(att)]), ring=True))
    return chains

def tier(fl, fmax):
    r = fl / fmax
    return ("asosiy", 3.0) if r >= 0.45 else (("ikkinchi", 2.4) if r >= 0.15 else ("uchinchi", 2.0))

# ---- 5. Baholash: istalgan variant uchun PRD (qattiq qoplama boʻylab) ----
def eval_prd(walk, ods, gates_open=None, step=1.0):
    """walk — yuriladigan poligon. Kirish nuqtasi darvozada boʻlmasa, odam tashqi trotuar boʻylab
       eng yaqin darvozagacha yuradi (perimetr boʻylab masofa qoʻshiladi)."""
    G = build_grid(walk.buffer(0.01), step, MOVES)
    comp = max(nx.connected_components(G), key=len); G = G.subgraph(comp).copy()
    ring = SITE.exterior; L = ring.length
    def access(p):
        if gates_open is None:
            return [(snap(G, p), 0.0)]
        sp = ring.project(Point(p)); best = []
        for g in gates_open:
            sg = ring.project(Point(g)); d = abs(sp - sg); d = min(d, L - d)
            best.append((snap(G, g), d))
        return best
    res = []
    for od in ods:
        a, b = od["p"]
        straight = math.dist(a, b)
        if od["kind"] == "manzil":
            tgt_poly = FOUNT.buffer(3.0)
            tg = [n for n in G.nodes if tgt_poly.contains(Point(G.nodes[n]["xy"]))]
            straight = Point(a).distance(FOUNT.buffer(2.4))
        else:
            tg = None
        best = 1e9
        for sn, extra in access(a):
            dist = nx.single_source_dijkstra_path_length(G, sn, weight="w")
            if tg is not None:
                d = min((dist.get(n, 1e9) for n in tg), default=1e9)
            else:
                d = min(dist.get(n, 1e9) + e2 for n, e2 in access(b))
            best = min(best, d + extra)
        res.append(dict(o=od["o"], d=od["d"], f=od["f"], straight=straight, net=best, prd=best/max(straight, 1)))
    return res

def topo(chains, gates, perimeter=False):
    """link-node, CNR, gamma, alpha, boshi berklar (darvozalar va favvora halqasi hisobga olinadi)."""
    N = nx.MultiGraph()
    key = lambda n: n
    for c in chains: N.add_edge(c["a"], c["b"])
    if perimeter:
        # darvozalar tashqi trotuar (OSM footway, uchastka perimetri) bilan ketma-ket ulangan
        gnode = {}
        for c in chains:
            for k, idx in (("a", 0), ("b", -1)):
                p = c["xy"][idx]
                for gi, g in enumerate(gates):
                    if math.dist(p, g["p"]) < 3.0: gnode[gi] = c[k]
        ring = SITE.exterior
        order = sorted(gnode, key=lambda gi: ring.project(Point(gates[gi]["p"])))
        for i in range(len(order)):
            N.add_edge(gnode[order[i]], gnode[order[(i+1) % len(order)]])
    v = N.number_of_nodes(); e = N.number_of_edges()
    deg = dict(N.degree())
    return dict(v=v, e=e, lnr=e/v, cnr=sum(1 for d in deg.values() if d >= 3)/v,
                gamma=e/(3*(v-2)) if v > 2 else 0, alpha=(e-v+1)/(2*v-5) if v > 2 else 0,
                deadends=sum(1 for d in deg.values() if d == 1))

if __name__ == "__main__":
    ods = od_pairs()
    gates = cluster_gates(ods)
    print("OD:", len(ods), "darvozalar:", len(gates))
    for g in gates: print("  gate", [round(c, 1) for c in g["p"]], round(g["f"], 2))
    allowed = SITE.buffer(-0.3).difference(PLAZA.buffer(1.2))
    G = build_grid(allowed)
    route_bundled(G, ods)
    H, chains, ends = extract_network(G)
    chains = clean(chains, gates, PLAZA, add_ring=True)
    fmax = max(c["flow"] for c in chains)
    for c in chains:
        c["tier"], c["w"] = tier(c["flow"], fmax)
        if all(Point(p).distance(PLAZA.exterior) < 1.6 for p in c["xy"]): c["tier"], c["w"] = "halqa", 2.4
    print("zanjirlar:", len(chains), [(c["tier"], round(LineString(c["xy"]).length, 1)) for c in chains])
    json.dump(dict(ods=[{k: v for k, v in o.items() if k != "path"} for o in ods], gates=gates,
                   chains=[dict(xy=c["xy"], flow=c["flow"], tier=c["tier"], w=c["w"]) for c in chains]),
              open("net_tc.json", "w"), ensure_ascii=False, default=str)
