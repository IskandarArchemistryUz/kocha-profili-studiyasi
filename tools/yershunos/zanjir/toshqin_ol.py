"""Yershunos · respublika toshqin qatlami uchun ma'lumot yig'ish. Internet uzilsa — kutib, uzilgan joyidan davom etadi; qayta ishga tushirilsa tayyor fayllarga tegmaydi.
A) JRC CEMS-GloFAS global daryo toshqini xaritalari v2.1 (~90 m, suv chuqurligi; qaytalanish 10/100/500 yil) — O'zbekiston qamrovi qirqib olinadi (uint8, dm).
B) Terrain Tiles (Terrarium) z10 relyef plitkalari — butun respublika (keyingi bosqich: soy bo'yi zonasi uchun)."""
import os, sys, time, math, json, requests, numpy as np
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(HERE, "kesh"); J = os.path.join(K, "jrc"); D10 = os.path.join(K, "dem10")
os.makedirs(J, exist_ok=True); os.makedirs(D10, exist_ok=True)
W, S, E, N = 55.9, 37.0, 73.3, 45.7
L = []; T0 = time.time()
def yoz(*a):
    s = time.strftime("%H:%M:%S ") + " ".join(str(x) for x in a); print(s, flush=True); L.append(s)
    try: open(os.path.join(HERE, "natija_toshqin.txt"), "w", encoding="utf-8").write("\n".join(L))
    except Exception: pass
H = {"User-Agent": "Mozilla/5.0 (Yershunos, Archemistry Lab)"}
def yukla(url, path, eng_kam=1000):
    """Range bilan davom ettiradigan yuklash; internet yo'q bo'lsa 12 soatgacha kutadi."""
    tmp = path + ".qism"; kut = 5; t_bosh = time.time()
    while True:
        try:
            bor = os.path.getsize(tmp) if os.path.exists(tmp) else 0
            h = dict(H); 
            if bor: h["Range"] = f"bytes={bor}-"
            with requests.get(url, headers=h, stream=True, timeout=(30, 120)) as r:
                if r.status_code == 404: return 404
                if r.status_code == 416: os.replace(tmp, path); return 200
                if r.status_code not in (200, 206): raise IOError(f"HTTP {r.status_code}")
                if bor and r.status_code == 200: bor = 0; open(tmp, "wb").close()
                jami = bor + int(r.headers.get("Content-Length", 0)); oxirgi = time.time()
                with open(tmp, "ab") as f:
                    for c in r.iter_content(1 << 20):
                        f.write(c); bor += len(c)
                        if time.time() - oxirgi > 30: yoz(f"   … {os.path.basename(path)} {bor >> 20}/{jami >> 20} MB"); oxirgi = time.time()
                if jami and bor < jami: raise IOError("to'liq emas")
            if os.path.getsize(tmp) < eng_kam: raise IOError("fayl juda kichik")
            os.replace(tmp, path); return 200
        except Exception as e:
            if time.time() - t_bosh > 12 * 3600: yoz("VOZ KECHILDI:", os.path.basename(path), str(e)[:80]); return 0
            yoz(f"   uzildi ({str(e)[:60]}) — {kut} s dan keyin davom"); time.sleep(kut); kut = min(300, kut * 2)
# ---------- A) JRC ----------
import rasterio
from rasterio.windows import from_bounds, Window
BASE = "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/CEMS-GLOFAS/flood_hazard/"
PL = ["ID168_N40_E50", "ID177_N40_E60", "ID183_N40_E70", "ID167_N50_E50", "ID176_N50_E60", "ID182_N50_E70"]
X = {}
for rp in (100, 10, 500):
    for pl in PL:
        chiq = os.path.join(J, f"uzb_RP{rp}_{pl.split('_', 1)[1]}.tif")
        if os.path.exists(chiq): yoz("bor:", os.path.basename(chiq)); continue
        xom = os.path.join(J, f"{pl}_RP{rp}_depth.tif")
        if not os.path.exists(xom):
            yoz("yuklanmoqda:", os.path.basename(xom)); k = yukla(f"{BASE}RP{rp}/{pl}_RP{rp}_depth.tif", xom, 10000)
            if k != 200: yoz("  → yo'q, kod", k); continue
        try:
            with rasterio.open(xom) as ds:
                b = ds.bounds; w, s, e, n = max(W, b.left), max(S, b.bottom), min(E, b.right), min(N, b.top)
                if w >= e or s >= n:
                    yoz(f"  {pl}: qamrov {tuple(round(v, 1) for v in b)} — O'zbekistonga tushmaydi"); open(chiq + ".yoq", "w").close(); os.remove(xom); continue
                win = from_bounds(w, s, e, n, ds.transform).round_offsets().round_lengths()
                prof = dict(driver="GTiff", dtype="uint8", count=1, width=int(win.width), height=int(win.height), crs=ds.crs, transform=ds.window_transform(win), compress="deflate", predictor=2, tiled=True, blockxsize=512, blockysize=512, nodata=0)
                nd = ds.nodata; hul = 0; mx = 0.0
                with rasterio.open(chiq + ".tmp", "w", **prof) as o:
                    for r0 in range(0, int(win.height), 1024):
                        hh = min(1024, int(win.height) - r0); a = ds.read(1, window=Window(win.col_off, win.row_off + r0, win.width, hh)).astype("float32")
                        ok = np.isfinite(a) & (a > 0) & (a < 1000) & ((a != nd) if nd is not None else True)
                        u = np.zeros(a.shape, "uint8"); u[ok] = np.clip(np.round(a[ok] * 10), 1, 250); o.write(u, 1, window=Window(0, r0, win.width, hh)); hul += int(ok.sum()); mx = max(mx, float(a[ok].max()) if ok.any() else 0)
                os.replace(chiq + ".tmp", chiq); X[os.path.basename(chiq)] = {"katak": hul, "eng_chuqur_m": round(mx, 1), "chegara": [w, s, e, n], "piksel_grad": ds.res[0]}
                yoz(f"  {os.path.basename(chiq)}: {int(win.width)}×{int(win.height)}, suvli katak {hul}, eng chuqur {mx:.1f} m, {os.path.getsize(chiq) >> 10} KB")
            os.remove(xom)
        except Exception as e:
            yoz("  qirqishda xato:", pl, rp, str(e)[:120])
json.dump(X, open(os.path.join(J, "jrc_xulosa.json"), "w", encoding="utf-8"), ensure_ascii=False)
yoz(f"A TAYYOR · {int(time.time() - T0)} s · fayllar: {len([f for f in os.listdir(J) if f.startswith('uzb_') and f.endswith('.tif')])}")
# ---------- B) relyef z10 ----------
Z = 10; nn = 1 << Z
tx = lambda lon: int((lon + 180) / 360 * nn); ty = lambda lat: int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * nn)
ish = [(x, y) for x in range(tx(W), tx(E) + 1) for y in range(ty(N), ty(S) + 1) if not os.path.exists(os.path.join(D10, f"{x}_{y}.png"))]
yoz(f"B: relyef z10 — {len(ish)} plitka yuklanadi")
def bitta(xy):
    x, y = xy; return yukla(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png", os.path.join(D10, f"{x}_{y}.png"), 200)
tay = 0
with ThreadPoolExecutor(6) as ex:
    for k in ex.map(bitta, ish):
        tay += 1
        if tay % 200 == 0: yoz(f"   relyef {tay}/{len(ish)}")
yoz(f"B TAYYOR · plitkalar: {len(os.listdir(D10))}")
yoz(f"HAMMASI TAYYOR · {int(time.time() - T0)} s")
