"""yershunos.tasir — ta'sir (exposure): xavf zonasidagi aholi va binolar.

Kirish:
  - xavf rastri (istalgan CRS): chuqurlik (m) yoki 0/1 niqob — toshqin, jala, vodiy tubi, koridor ...
  - aholi rastri: GHS-POP R2023A, 100 m, EPSG:54009, katakdagi odam soni (CC BY 4.0, JRC)
  - binolar: Overture Maps `building` (GeoParquet, ODbL) yoki OSM / kadastr poligonlari
  - birliklar (ixtiyoriy): mahalla / tuman poligonlari

Qoida: aholi rastri SON saqlaydi, shuning uchun u qayta namunalanmaydi. Aksincha, xavf niqobi
aholi to'riga «o'rtacha» usulida o'tkaziladi (katakning xavfdagi ulushi) va son shu ulushga ko'paytiriladi.
Natija — skrining: 100 m katak ichida aholi bir tekis taqsimlangan deb olinadi.
"""
from __future__ import annotations
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.windows import from_bounds
from rasterio.features import geometry_mask, rasterize

CHUQURLIK_SINFLARI = (0.1, 0.5, 1.5)  # m: sayoz / o'rta / chuqur chegaralari


def _xavf_ulushi_aholi_torida(xavf, xavf_tr, xavf_crs, pop_ds, chegara):
    """Xavf niqobini aholi to'riga o'tkazadi. Qaytaradi: (pop, ulush, transform)."""
    h, w = xavf.shape
    b = rasterio.transform.array_bounds(h, w, xavf_tr)
    pb = transform_bounds(xavf_crs, pop_ds.crs, *b, densify_pts=21)
    win = from_bounds(*pb, transform=pop_ds.transform).round_offsets().round_lengths()
    win = win.intersection(rasterio.windows.Window(0, 0, pop_ds.width, pop_ds.height))
    pop = pop_ds.read(1, window=win).astype("float64")
    nd = pop_ds.nodata
    if nd is not None:
        pop[pop == nd] = 0.0
    pop[~np.isfinite(pop) | (pop < 0)] = 0.0
    ptr = pop_ds.window_transform(win)
    niqob = (np.nan_to_num(xavf, nan=0.0) >= chegara).astype("float32")
    ulush = np.zeros(pop.shape, "float32")
    reproject(niqob, ulush, src_transform=xavf_tr, src_crs=xavf_crs,
              dst_transform=ptr, dst_crs=pop_ds.crs, resampling=Resampling.average,
              src_nodata=None, dst_nodata=0.0)
    # xavf rastri qamramagan joy: ulush 0 (hisobga kirmaydi)
    return pop, np.clip(ulush, 0, 1), ptr


def aholi_xavfda(xavf, xavf_tr, xavf_crs, pop_yol, chegara=0.1):
    """Xavf zonasidagi aholi. chegara — chuqurlik (m) yoki niqob uchun 0.5."""
    with rasterio.open(pop_yol) as ds:
        pop, ulush, _ = _xavf_ulushi_aholi_torida(xavf, xavf_tr, xavf_crs, ds, chegara)
    jami = float(pop.sum())
    xavfda = float((pop * ulush).sum())
    return {"aholi_jami": round(jami), "aholi_xavfda": round(xavfda),
            "ulush": round(xavfda / jami, 4) if jami > 0 else None,
            "izoh": "GHS-POP 100 m; katak ichida bir tekis taqsimot farazi"}


def birliklar_boyicha(xavf, xavf_tr, xavf_crs, pop_yol, birliklar, nom="nom", chegara=0.1):
    """Mahalla/tuman bo'yicha jadval: aholi, xavfdagi aholi, ulush. birliklar — GeoDataFrame."""
    with rasterio.open(pop_yol) as ds:
        pop, ulush, ptr = _xavf_ulushi_aholi_torida(xavf, xavf_tr, xavf_crs, ds, chegara)
        g = birliklar.to_crs(ds.crs)
    idx = rasterize(((geom, i + 1) for i, geom in enumerate(g.geometry)), out_shape=pop.shape,
                    transform=ptr, fill=0, dtype="int32")
    qator = []
    for i, n in enumerate(g[nom]):
        m = idx == i + 1
        a, x = float(pop[m].sum()), float((pop[m] * ulush[m]).sum())
        qator.append({"nom": n, "aholi": round(a), "xavfda": round(x),
                      "ulush": round(x / a, 4) if a > 0 else None})
    return sorted(qator, key=lambda r: -r["xavfda"])


def binolar_xavfda(binolar, xavf, xavf_tr, xavf_crs, sinflar=CHUQURLIK_SINFLARI):
    """Har bino izi ostidagi eng katta qiymat (all_touched). binolar — GeoDataFrame (poligon).
    Qaytaradi: (xulosa, har bino uchun max qiymat massivi)."""
    g = binolar.to_crs(xavf_crs)
    h, w = xavf.shape
    z = np.nan_to_num(xavf, nan=0.0)
    mx = np.zeros(len(g), "float32")
    inv = ~xavf_tr
    for i, geom in enumerate(g.geometry):
        if geom is None or geom.is_empty:
            continue
        x0, y0, x1, y1 = geom.bounds
        c0, r1 = inv * (x0, y0)
        c1, r0 = inv * (x1, y1)
        ra, rb = max(int(np.floor(min(r0, r1))), 0), min(int(np.ceil(max(r0, r1))) + 1, h)
        ca, cb = max(int(np.floor(min(c0, c1))), 0), min(int(np.ceil(max(c0, c1))) + 1, w)
        if ra >= rb or ca >= cb:
            continue
        tr = xavf_tr * rasterio.Affine.translation(ca, ra)
        ichida = ~geometry_mask([geom], (rb - ra, cb - ca), tr, all_touched=True)
        if ichida.any():
            mx[i] = z[ra:rb, ca:cb][ichida].max()
    s1, s2, s3 = sinflar
    xul = {"bino_jami": int(len(g)), "suvda": int((mx >= s1).sum()),
           "sayoz": int(((mx >= s1) & (mx < s2)).sum()), "orta": int(((mx >= s2) & (mx < s3)).sum()),
           "chuqur": int((mx >= s3).sum()), "sinflar_m": list(sinflar),
           "izoh": "bino izi ostidagi eng katta chuqurlik; rastr katagidan kichik bino — katak qiymati"}
    return xul, mx


def bino_manbasi_qamrovi(binolar, qurilgan, tr, crs, chegara=0.3):
    """Bino qatlami qurilgan maydonni qanchalik qamraydi (WSF/GHS qurilgan niqobiga nisbatan).
    Past bo'lsa — bayroq: «bino manbasi to'liq emas»."""
    g = binolar.to_crs(crs)
    bor = rasterize(((geom, 1) for geom in g.geometry if geom is not None and not geom.is_empty),
                    out_shape=qurilgan.shape, transform=tr, fill=0, all_touched=True, dtype="uint8")
    q = np.nan_to_num(qurilgan, nan=0.0) >= chegara
    n = int(q.sum())
    return {"qamrov": round(float((bor[q] > 0).mean()), 3) if n else None, "qurilgan_katak": n}
