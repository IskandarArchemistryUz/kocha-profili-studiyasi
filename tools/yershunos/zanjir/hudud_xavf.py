"""Yershunos · hudud xavfi (relyef asosida): vodiy tubi, tik yonbag'ir × aholi (1980–2030), binolar, qishloqlar.
Ishga tushirish:  python hudud_xavf.py baxmal
Kirish: hudud/<nom>/chegara.geojson (tuman poligoni, EPSG:4326), hudud/<nom>/sozlama.json {"k": 1.39, "nom": "Baxmal tumani"}
Manbalar: relyef — Terrain Tiles (Terrarium, z11, ~59 m); aholi — GHS-POP R2023A 100 m; binolar — Overture Maps; joy nomlari — OpenStreetMap.
Hammasi skrining: vodiy tubi geometrik belgi (o'zandan balandlik), toshqin chegarasi emas."""
from __future__ import annotations
import heapq, io, json, math, os, subprocess, sys, time, traceback
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
NOM = sys.argv[1] if len(sys.argv) > 1 else "baxmal"
HUD = os.path.join(HERE, "hudud", NOM); KESH = os.path.join(HERE, "kesh"); DK = os.path.join(KESH, "dem11"); os.makedirs(DK, exist_ok=True)
LOG = []; T0 = time.time()
DAVR = [1980, 1990, 2000, 2010, 2020, 2030]
Z = 11; R = 6378137.0; RES = 2 * math.pi * R / (256 * 2 ** Z)
AWS = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/"
UA = {"User-Agent": "Yershunos/0.1 (archemistry.uz; skrining)", "Accept": "*/*"}


def yoz(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); LOG.append(s)
    open(os.path.join(HERE, f"natija_{NOM}.txt"), "w", encoding="utf-8").write("\n".join(LOG))


def ol(url, yol, urinish=5, **kw):
    import requests
    if os.path.exists(yol) and os.path.getsize(yol) > 200:
        return True
    for u in range(1, urinish + 1):
        try:
            r = requests.get(url, headers=UA, timeout=(20, 90), **kw)
            if r.status_code == 200 and len(r.content) > 200:
                open(yol, "wb").write(r.content); return True
            yoz("   HTTP", r.status_code, url[-28:])
        except Exception as e:
            yoz("   uzildi", u, str(e)[:60])
        time.sleep(2 * u)
    return False


# ---------------------------------------------------------------- relyef
def dem(bbox):
    """Terrarium plitkalaridan balandlik to'ri (EPSG:3857 piksel to'ri). Qaytaradi: z (h×w, m), Affine."""
    from PIL import Image
    from rasterio import Affine
    W, S, E, N = bbox
    mx = lambda l: (l + 180) / 360
    my = lambda l: 0.5 - math.log((1 + math.sin(math.radians(l))) / (1 - math.sin(math.radians(l)))) / (4 * math.pi)
    sc = 256 * 2 ** Z
    px0, py0 = int(mx(W) * sc), int(my(N) * sc); w, h = int(math.ceil(mx(E) * sc)) - px0, int(math.ceil(my(S) * sc)) - py0
    tx0, ty0, tx1, ty1 = px0 // 256, py0 // 256, (px0 + w - 1) // 256, (py0 + h - 1) // 256
    moz = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256), "float32"); n = 0
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            yol = os.path.join(DK, f"{Z}_{tx}_{ty}.png")
            if not ol(f"{AWS}{Z}/{tx}/{ty}.png", yol):
                raise RuntimeError(f"relyef plitkasi yuklanmadi: {Z}/{tx}/{ty}")
            a = np.asarray(Image.open(yol).convert("RGB"), "float32")
            moz[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
            n += 1
    z = moz[py0 - ty0 * 256:py0 - ty0 * 256 + h, px0 - tx0 * 256:px0 - tx0 * 256 + w].copy()
    x0 = px0 * RES - math.pi * R; y0 = math.pi * R - py0 * RES
    yoz(f"  relyef: {n} plitka, to'r {w}×{h}, {z.min():.0f}–{z.max():.0f} m")
    return z, Affine(RES, 0, x0, 0, -RES, y0)


def oqim(z):
    """Priority-flood (chuqurlar to'ldiriladi) → D8 yo'nalish, tartib, oqim to'planishi (katak soni)."""
    h, w = z.shape; n = h * w; zv = z.ravel().astype("float64")
    fl = np.empty(n); d = np.full(n, -1, "int64"); vis = np.zeros(n, bool); tart = np.empty(n, "int64"); heap = []; oi = 0
    for y in range(h):
        for x in ((range(w)) if y in (0, h - 1) else (0, w - 1)):
            i = y * w + x; fl[i] = zv[i]; vis[i] = True; heap.append((zv[i], i))
    heapq.heapify(heap); push, pop = heapq.heappush, heapq.heappop
    while heap:
        fc, c = pop(heap); tart[oi] = c; oi += 1; x = c % w; y = c // w
        for j in (-1, 0, 1):
            Y = y + j
            if Y < 0 or Y >= h: continue
            for i in (-1, 0, 1):
                X = x + i
                if X < 0 or X >= w or (i == 0 and j == 0): continue
                q = Y * w + X
                if vis[q]: continue
                vis[q] = True; v = zv[q] if zv[q] > fc else fc; fl[q] = v; d[q] = c; push(heap, (v, q))
    acc = np.ones(n)
    for k in range(n - 1, -1, -1):
        c = tart[k]
        if d[c] >= 0: acc[d[c]] += acc[c]
    return d, tart, acc


def hand(z, d, tart, acc, thr):
    """O'zandan balandlik (m): har katak o'zi quyiladigan o'zan katagining balandligidan qancha baland."""
    zv = z.ravel().astype("float64"); n = zv.size; base = np.full(n, np.nan); st = acc >= thr
    for k in range(n):
        c = tart[k]
        base[c] = zv[c] if st[c] else (base[d[c]] if d[c] >= 0 else np.nan)
    return (zv - base).reshape(z.shape), st.reshape(z.shape)


# ---------------------------------------------------------------- ma'lumot
def overture(tur, bbox):
    import geopandas as gpd
    yol = os.path.join(KESH, f"overture_{tur}_{NOM}.parquet")
    def yaroqli():
        try: return os.path.exists(yol) and len(gpd.read_parquet(yol)) > 0
        except Exception: return False
    if not yaroqli():
        yoz(f"  Overture {tur} yuklanmoqda (bir necha daqiqa)...")
        cmd = [sys.executable, "-m", "overturemaps.cli", "download", "--bbox=" + ",".join(map(str, bbox)), "-f", "geoparquet",
               f"--type={tur}", "--connect_timeout", "60", "--request_timeout", "300", "-o", yol]
        for u in range(1, 5):
            if os.path.exists(yol): os.remove(yol)
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode == 0 and yaroqli(): break
            t = (r.stderr or r.stdout).strip().splitlines()
            yoz(f"   uzildi ({u}/4): {t[-1][:100] if t else ''}"); time.sleep(10 * u)
        else:
            return None
    g = gpd.read_parquet(yol)
    return g.set_crs("EPSG:4326") if g.crs is None else g


def joylar(bbox):
    """Aholi punktlari (nuqta): OSM place=*, bo'lmasa Overture division. Qaytaradi: [(nom, tur, lon, lat)]."""
    import requests
    yol = os.path.join(KESH, f"osm_joylar_{NOM}.json"); W, S, E, N = bbox
    if not os.path.exists(yol):
        q = f'[out:json][timeout:90];node["place"~"^(city|town|village|hamlet|suburb|neighbourhood)$"]({S},{W},{N},{E});out;'
        for url in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"] * 2:
            try:
                r = requests.post(url, data={"data": q}, headers=UA, timeout=(30, 120))
                if r.status_code == 200 and '"elements"' in r.text:
                    open(yol, "w", encoding="utf-8").write(r.text); break
                yoz("   OSM HTTP", r.status_code, url.split("/")[2])
            except Exception as e:
                yoz("   OSM uzildi", str(e)[:60])
            time.sleep(6)
    if os.path.exists(yol):
        el = json.load(open(yol, encoding="utf-8"))["elements"]
        return [((e["tags"].get("name:uz") or e["tags"].get("name") or "?"), e["tags"].get("place"), e["lon"], e["lat"]) for e in el if "tags" in e], "OpenStreetMap"
    g = overture("division", bbox)
    if g is None: return [], "yo'q"
    nm = lambda n: (n or {}).get("primary", "?") if isinstance(n, dict) else str(n)
    return [(nm(r["names"]), r.get("subtype", "?"), r.geometry.x, r.geometry.y) for _, r in g.iterrows() if r.geometry is not None and r.geometry.geom_type == "Point"], "Overture"


def main():
    import rasterio, geopandas as gpd, tasir, angren_sinov as A
    from rasterio.features import rasterize
    from pyproj import Transformer
    soz = json.load(open(os.path.join(HUD, "sozlama.json"), encoding="utf-8")); k = float(soz.get("k", 1.0))
    ch = gpd.read_file(os.path.join(HUD, "chegara.geojson")).to_crs("EPSG:4326"); ch["nom"] = soz.get("nom", NOM)
    b = ch.total_bounds; pad = 0.03; bbox = [float(round(b[0] - pad, 4)), float(round(b[1] - pad, 4)), float(round(b[2] + pad, 4)), float(round(b[3] + pad, 4))]
    yoz(f"HUDUD: {soz.get('nom', NOM)} · bbox {bbox} · k = {k}")
    N = {"hudud": soz.get("nom", NOM), "bbox": bbox, "k": k}

    # 1. relyef, oqim, vodiy tubi
    z, tr = dem(bbox); h, w = z.shape; lat0 = (bbox[1] + bbox[3]) / 2; dx = RES * math.cos(math.radians(lat0)); ckm = dx * dx / 1e6
    t = time.time(); d, tart, acc = oqim(z); yoz(f"  oqim hisobi: {time.time() - t:.0f} s, katak {dx:.0f} m")
    hA, sA = hand(z, d, tart, acc, 10 / ckm)       # asosiy daryolar: havzasi ≥ 10 km²
    hB, sB = hand(z, d, tart, acc, 1 / ckm)        # soylar ham: havzasi ≥ 1 km²
    gy, gx = np.gradient(z.astype("float64"), dx); qiya = np.degrees(np.arctan(np.hypot(gx, gy)))
    ichida = rasterize(((g, 1) for g in ch.to_crs("EPSG:3857").geometry), out_shape=z.shape, transform=tr, fill=0, dtype="uint8").astype(bool)
    NIQ = {"daryo_2m": (hA <= 2), "daryo_5m": (hA <= 5), "daryo_10m": (hA <= 10), "soy_5m": (hB <= 5), "soy_3m": (hB <= 3),
           "tik_15": qiya > 15, "tik_30": qiya > 30, "tekis_5": qiya < 5}
    IZOH = {"daryo_2m": "asosiy daryo o'zanidan ≤ 2 m baland", "daryo_5m": "asosiy daryo o'zanidan ≤ 5 m baland (vodiy tubi)", "daryo_10m": "asosiy daryo o'zanidan ≤ 10 m baland",
            "soy_5m": "har qanday soy (havzasi ≥ 1 km²) o'zanidan ≤ 5 m baland", "soy_3m": "har qanday soy o'zanidan ≤ 3 m baland",
            "tik_15": "qiyalik > 15°", "tik_30": "qiyalik > 30°", "tekis_5": "qiyalik < 5° (qurishga qulay yer)"}
    may = float(ichida.sum() * ckm)
    N["maydon_km2"] = round(may, 1); N["balandlik_m"] = [round(float(z[ichida].min())), round(float(np.median(z[ichida]))), round(float(z[ichida].max()))]
    N["maydon"] = {n: round(float((m & ichida).sum() * ckm), 1) for n, m in NIQ.items()}
    N["oqim_km"] = {"daryo": round(float((sA & ichida).sum() * dx * 1.2 / 1000)), "soy": round(float((sB & ichida).sum() * dx * 1.2 / 1000))}
    N["tekis_yerning_vodiy_tubidagi_ulushi"] = round(float((NIQ["tekis_5"] & NIQ["soy_5m"] & ichida).sum() / max((NIQ["tekis_5"] & ichida).sum(), 1)), 3)
    yoz(f"  maydon {may:.0f} km² · balandlik {N['balandlik_m']} · zonalar km²: {N['maydon']}")
    yoz(f"  qurishga qulay (<5°) yerning {N['tekis_yerning_vodiy_tubidagi_ulushi'] * 100:.0f} % i soy bo'yida (≤ 5 m)")

    # 2. aholi × zona, 1980–2030 (tuman chegarasi ichida)
    N["aholi"] = {}
    for y in DAVR:
        try:
            py = A.pop_fayl(y, bbox)
        except Exception as e:
            yoz(f"  {y}: aholi rastri yo'q ({str(e)[:60]})"); continue
        if not py: continue
        q = {}
        for n in ("daryo_2m", "daryo_5m", "daryo_10m", "soy_5m", "soy_3m", "tik_15", "tik_30"):
            r = tasir.birliklar_boyicha(NIQ[n].astype("float32"), tr, "EPSG:3857", py, ch, chegara=0.5)[0]
            q["jami"] = r["aholi"]; q[n] = r["xavfda"]
        N["aholi"][y] = q
        yoz(f"  {y}: model {q['jami']:>7} · soy≤5m {q['soy_5m']:>6} ({q['soy_5m'] / max(q['jami'], 1) * 100:4.1f} %) · daryo≤5m {q['daryo_5m']:>6} ({q['daryo_5m'] / max(q['jami'], 1) * 100:4.1f} %) · tik>15° {q['tik_15']:>6}")
    if 2020 in N["aholi"]:
        a = N["aholi"][2020]; N["aholi_2020_tuzatilgan"] = {n: round(v * k) for n, v in a.items()}
        yoz(f"  2020, rasmiy songa tuzatilgan (×{k}): jami {round(a['jami'] * k)} · soy≤5m {round(a['soy_5m'] * k)} · daryo≤5m {round(a['daryo_5m'] * k)} · daryo≤2m {round(a['daryo_2m'] * k)}")

    # 3. binolar
    bg = None
    try:
        bg = overture("building", bbox)
    except Exception as e:
        yoz("  binolar: xato", str(e)[:80])
    cen = None
    if bg is not None and len(bg):
        bg = bg[bg.geometry.notna()]; bg = bg[bg.intersects(ch.geometry.union_all() if hasattr(ch.geometry, "union_all") else ch.unary_union)].copy()
        N["bino"] = {"jami": int(len(bg)), "manba": A.manba_ulushi(bg)}
        bq = {}
        for n, kat in (("daryo_2m", hA), ("daryo_5m", hA), ("daryo_10m", hA), ("soy_5m", hB), ("soy_3m", hB)):
            lim = float(n.split("_")[1][:-1]); niq = (kat <= lim).astype("float32")
            _, mxv = tasir.binolar_xavfda(bg, niq, tr, "EPSG:3857", sinflar=(0.5, 2, 3)); bq[n] = mxv >= 0.5; N["bino"][n] = int(bq[n].sum())
        _, mt = tasir.binolar_xavfda(bg, (qiya > 15).astype("float32"), tr, "EPSG:3857", sinflar=(0.5, 2, 3)); N["bino"]["tik_15"] = int((mt >= 0.5).sum())
        yoz(f"  binolar: {len(bg)} · soy≤5m {N['bino']['soy_5m']} ({N['bino']['soy_5m'] / len(bg) * 100:.1f} %) · daryo≤5m {N['bino']['daryo_5m']} · daryo≤2m {N['bino']['daryo_2m']} · tik>15° {N['bino']['tik_15']} · manba {N['bino']['manba']}")
        c = bg.geometry.to_crs("EPSG:32642").centroid; cen = np.c_[c.x.values, c.y.values]
    else:
        yoz("  binolar: yuklanmadi — bu qism hisoblanmadi")

    # 4. qishloqlar: har bino eng yaqin aholi punktiga (≤ 2 km) biriktiriladi
    try:
        jl, jm = joylar(bbox)
    except Exception as e:
        jl, jm = [], "xato"; yoz("  joy nomlari: xato", str(e)[:80])
    N["joy_manbasi"] = jm; N["qishloqlar"] = []
    if jl and cen is not None:
        T = Transformer.from_crs(4326, 32642, always_xy=True); jx, jy = T.transform([j[2] for j in jl], [j[3] for j in jl]); J = np.c_[jx, jy]
        eng = np.empty(len(cen), "int64"); mas = np.empty(len(cen))
        for s in range(0, len(cen), 20000):
            dd = np.hypot(cen[s:s + 20000, None, 0] - J[None, :, 0], cen[s:s + 20000, None, 1] - J[None, :, 1]); eng[s:s + 20000] = dd.argmin(1); mas[s:s + 20000] = dd.min(1)
        ok = mas <= 2000
        for i, j in enumerate(jl):
            m = ok & (eng == i); nb = int(m.sum())
            if nb < 15: continue
            N["qishloqlar"].append({"nom": j[0], "tur": j[1], "lon": round(j[2], 4), "lat": round(j[3], 4), "bino": nb, "soy_5m": int(bq["soy_5m"][m].sum()), "daryo_5m": int(bq["daryo_5m"][m].sum()),
                                    "daryo_2m": int(bq["daryo_2m"][m].sum()), "ulush_soy_5m": round(float(bq["soy_5m"][m].mean()), 3)})
        N["qishloqlar"].sort(key=lambda r: -r["soy_5m"])
        N["biriktirilmagan_bino"] = int((~ok).sum())
        yoz(f"  aholi punktlari ({jm}): {len(jl)} nuqta, {len(N['qishloqlar'])} tasida ≥ 15 bino; 2 km dan uzoq binolar: {N['biriktirilmagan_bino']}")
        yoz("  SOY BO'YIDAGI (≤ 5 m) BINOLAR BO'YICHA BIRINCHI 25:")
        for r in N["qishloqlar"][:25]:
            yoz(f"    {r['nom'][:26]:26s} {r['tur'][:8]:8s} bino {r['bino']:5d} · soy≤5m {r['soy_5m']:4d} ({r['ulush_soy_5m'] * 100:3.0f} %) · daryo≤5m {r['daryo_5m']:4d} · daryo≤2m {r['daryo_2m']:4d}")

    # 5. xarita (ko'rib chiqish uchun) va sahifa qatlamlari
    try:
        from PIL import Image
        hs = np.clip(128 + (gx - gy) * 260, 20, 235).astype("uint8"); rgb = np.stack([hs, hs, hs], -1).astype("float32")
        rgb[~ichida] *= 0.35
        def boya(m, c, a):
            for q in range(3): rgb[..., q][m] = rgb[..., q][m] * (1 - a) + c[q] * a
        boya(NIQ["soy_5m"], (255, 79, 163), 0.45); boya(NIQ["daryo_2m"], (255, 20, 130), 0.75); boya(sB, (30, 150, 200), 0.9); boya(sA, (58, 209, 232), 1.0)
        if cen is not None:
            g3 = bg.geometry.to_crs("EPSG:3857").centroid; cc = ((g3.x.values - tr.c) / RES).astype(int); rr = ((tr.f - g3.y.values) / RES).astype(int)
            okk = (cc >= 0) & (cc < w) & (rr >= 0) & (rr < h)
            rgb[rr[okk], cc[okk]] = (255, 255, 255); xv = okk & bq["soy_5m"]; rgb[rr[xv], cc[xv]] = (255, 214, 64)
        Image.fromarray(rgb.astype("uint8")).save(os.path.join(HUD, "xarita.png"))
        def png(m, c, yol):
            o = np.zeros((h, w, 4), "uint8"); o[m] = c; Image.fromarray(o).save(yol)
        png(NIQ["soy_5m"] & ichida, (255, 79, 163, 130), os.path.join(HUD, "vb_soy5.png")); png(NIQ["daryo_2m"] & ichida, (255, 20, 130, 200), os.path.join(HUD, "vb_daryo2.png")); png(sB, (30, 150, 200, 255), os.path.join(HUD, "oqim.png"))
        lo = lambda x: math.degrees(x / R); la = lambda y: math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2)
        N["qatlam_burchaklari"] = [[lo(tr.c), la(tr.f)], [lo(tr.c + w * RES), la(tr.f)], [lo(tr.c + w * RES), la(tr.f - h * RES)], [lo(tr.c), la(tr.f - h * RES)]]
        yoz("  xarita.png va qatlamlar saqlandi")
    except Exception:
        yoz("  xarita chizilmadi:\n" + traceback.format_exc()[-400:])
    N["soniya"] = round(time.time() - T0)
    json.dump(N, open(os.path.join(HERE, f"natija_{NOM}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    yoz(f"TAYYOR · {N['soniya']} s")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        yoz("XATO:\n" + traceback.format_exc())
