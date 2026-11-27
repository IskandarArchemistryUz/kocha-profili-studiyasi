"""Yershunos · ekin yeri va qurilish: ma'lumot yuklash.
1) GHS-BUILT-S R2023A, 1 km (qurilgan maydon, m²/katak), 1980 / 2000 / 2020 — O'zbekiston plitkalari.
2) ESA WorldCover 2021 v200 (10 m): har 3°×3° plitkadan faqat kichraytirilgan ko'rinish (~160 m) o'qiladi — to'liq fayl yuklanmaydi."""
import os, sys, time, zipfile, traceback
HERE = os.path.dirname(os.path.abspath(__file__)); KESH = os.path.join(HERE, "kesh"); WC = os.path.join(KESH, "worldcover"); os.makedirs(WC, exist_ok=True)
sys.path.insert(0, HERE)
L = []; T0 = time.time()
def yoz(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); L.append(s)
    open(os.path.join(HERE, "natija_yer.txt"), "w", encoding="utf-8").write("\n".join(L))

def built():
    import angren_sinov as A
    U = ("https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_BUILT_S_GLOBE_R2023A/GHS_BUILT_S_E{y}_GLOBE_R2023A_54009_1000/V1-0/tiles/"
         "GHS_BUILT_S_E{y}_GLOBE_R2023A_54009_1000_V1_0_R{r}_C{c}.zip")
    ok = 0
    for y in (1980, 2000, 2020):
        for r in (4, 5):
            for c in (23, 24, 25):
                tif = os.path.join(KESH, f"GHS_BUILT1K_E{y}_R{r}_C{c}.tif")
                if os.path.exists(tif) and os.path.getsize(tif) > 1000:
                    ok += 1; continue
                z = tif[:-4] + ".zip"
                try:
                    if not A.yukla(U.format(y=y, r=r, c=c), z):
                        yoz("  BUILT yuklanmadi:", y, r, c); continue
                    with zipfile.ZipFile(z) as zf:
                        nom = [n for n in zf.namelist() if n.lower().endswith(".tif")][0]
                        open(tif, "wb").write(zf.read(nom))
                    os.remove(z); ok += 1
                except Exception as e:
                    yoz("  BUILT xato:", y, r, c, str(e)[:80])
        yoz(f"GHS-BUILT-S {y}: jami tayyor {ok} ({int(time.time() - T0)} s)")
    return ok

def worldcover():
    import numpy as np, rasterio
    from rasterio.enums import Resampling
    os.environ.update({"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif", "GDAL_HTTP_TIMEOUT": "120", "GDAL_HTTP_MAX_RETRY": "5", "GDAL_HTTP_RETRY_DELAY": "3", "VSI_CACHE": "TRUE"})
    B = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{t}_Map.tif"
    ok = 0; K = 16
    for la in (36, 39, 42, 45):
        for lo in (54, 57, 60, 63, 66, 69, 72):
            t = f"N{la:02d}E{lo:03d}"; out = os.path.join(WC, f"wc2021_{t}_x{K}.tif")
            if os.path.exists(out) and os.path.getsize(out) > 1000:
                ok += 1; continue
            for u in range(1, 4):
                try:
                    with rasterio.open(B.format(t=t)) as ds:
                        h, w = ds.height // K, ds.width // K
                        a = ds.read(1, out_shape=(h, w), resampling=Resampling.nearest)
                        tr = ds.transform * ds.transform.scale(ds.width / w, ds.height / h)
                        with rasterio.open(out, "w", driver="GTiff", height=h, width=w, count=1, dtype="uint8", crs=ds.crs, transform=tr, compress="deflate", tiled=True) as d:
                            d.write(a, 1)
                    ok += 1; yoz(f"  WorldCover {t}: {w}×{h}, {os.path.getsize(out) // 1024} KB, ekin ulushi {float((a == 40).mean()) * 100:.1f} % ({int(time.time() - T0)} s)"); break
                except Exception as e:
                    yoz(f"  WorldCover {t}: urinish {u}: {str(e)[:90]}"); time.sleep(5 * u)
    return ok

if __name__ == "__main__":
    try:
        yoz("BUILT:", built(), "/ 18")
    except Exception:
        yoz("BUILT XATO:\n" + traceback.format_exc()[-600:])
    try:
        yoz("WORLDCOVER:", worldcover(), "/ 28")
    except Exception:
        yoz("WORLDCOVER XATO:\n" + traceback.format_exc()[-600:])
    yoz(f"TAYYOR · {int(time.time() - T0)} s")
