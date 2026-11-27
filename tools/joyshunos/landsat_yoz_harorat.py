"""
Joyshunos quvuri, 1-vazifa: Landsat 8/9 yozgi sirt harorati (LST), Toshkent.

Manba: Landsat Collection 2 Level-2 (Microsoft Planetary Computer, "landsat-c2-l2"),
ST_B10 (lwir11) kanali. Haqiqiy aniqlik ~100 m (TIRS), fayl 30 m ga qayta bo'lingan.
Davr: har yil 1-iyun - 31-avgust, bulutsiz piksellar medianasi.

Ishga tushirish:
    pip install -r talablar.txt
    python landsat_yoz_harorat.py --yillar 2025
    python landsat_yoz_harorat.py --yillar 2013-2025

Natija (--chiqish papkasida, standart: ./natija):
    lst_yoz_<yil>.tif        - median harorat, °C, float32, COG, EPSG:32642
    lst_yoz_<yil>_soni.tif   - har pikselda nechta bulutsiz kuzatuv bor (uint8)
    lst_yoz_<yil>.json       - metama'lumot: tasvirlar soni, sahna ID lari, statistikalar
    web/toshkent_<yil>.bin   - Joyshunos uchun ixcham to'r (~0.001°, uint16)
    web/toshkent_index.json  - yillar ro'yxati va kodlash tavsifi (lst-data branchiga qo'yiladi)
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import xarray as xr

STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
KOLLEKSIYA = "landsat-c2-l2"

# Toshkent shahri va atrofi (lon_min, lat_min, lon_max, lat_max), WGS84
TOSHKENT_BBOX = (69.10, 41.15, 69.50, 41.45)
CRS = "EPSG:32642"  # UTM 42N
PIKSEL_M = 30

# Collection 2 Level-2 ST koeffitsiyentlari (USGS): K = DN * 0.00341802 + 149.0
ST_SCALE = 0.00341802
ST_OFFSET = 149.0
KELVIN = 273.15

# QA_PIXEL bitlari: 0 fill, 1 dilated cloud, 2 cirrus, 3 cloud, 4 cloud shadow, 5 snow
QA_YOMON_BITLAR = (0, 1, 2, 3, 4, 5)
QA_NIQOB = sum(1 << b for b in QA_YOMON_BITLAR)

# Fizik jihatdan maqbul oraliq (°C) - undan tashqaridagi qiymatlar artefakt deb tashlanadi
MIN_C, MAX_C = -10.0, 80.0


def yillarni_ochish(matn: str) -> list[int]:
    """'2025' -> [2025]; '2013-2016' -> [2013..2016]; '2015,2020,2025' -> [...]"""
    yillar: list[int] = []
    for qism in matn.split(","):
        qism = qism.strip()
        if not qism:
            continue
        if "-" in qism:
            a, b = (int(x) for x in qism.split("-", 1))
            if a > b:
                a, b = b, a
            yillar.extend(range(a, b + 1))
        else:
            yillar.append(int(qism))
    for y in yillar:
        if y < 2013:
            raise ValueError(f"{y}: Landsat 8 ma'lumoti 2013 yildan boshlanadi")
    return sorted(set(yillar))


def dn_dan_selsiy(st_dn: xr.DataArray, qa: xr.DataArray) -> xr.DataArray:
    """Xom ST_B10 (uint16) va QA_PIXEL dan niqoblangan °C qiymat."""
    yaxshi = ((qa.astype("uint32") & QA_NIQOB) == 0) & (st_dn > 0)
    c = st_dn.astype("float32") * ST_SCALE + ST_OFFSET - KELVIN
    c = c.where(yaxshi)
    c = c.where((c >= MIN_C) & (c <= MAX_C))
    return c


def yoz_medianasi(c: xr.DataArray) -> tuple[xr.DataArray, xr.DataArray]:
    """Vaqt bo'yicha median va har pikseldagi kuzatuvlar soni."""
    median = c.median(dim="time", skipna=True).astype("float32")
    soni = c.notnull().sum(dim="time").astype("uint8")
    return median, soni


def sahnalarni_izlash(yil: int, bbox, bulut_max: float):
    import planetary_computer
    import pystac_client

    katalog = pystac_client.Client.open(STAC_URL, modifier=planetary_computer.sign_inplace)
    izlov = katalog.search(
        collections=[KOLLEKSIYA],
        bbox=bbox,
        datetime=f"{yil}-06-01/{yil}-08-31",
        query={
            "platform": {"in": ["landsat-8", "landsat-9"]},
            "eo:cloud_cover": {"lt": bulut_max},
            "landsat:collection_category": {"in": ["T1"]},
        },
    )
    return list(izlov.items())


def yuklash(sahnalar, bbox) -> xr.Dataset:
    import odc.stac

    return odc.stac.load(
        sahnalar,
        bands=["lwir11", "qa_pixel"],
        bbox=bbox,
        crs=CRS,
        resolution=PIKSEL_M,
        groupby="solar_day",  # bir kundagi qo'shni sahnalar birlashtiriladi
        chunks={"x": 1024, "y": 1024},
        fail_on_error=False,
    )


def statistika(median: xr.DataArray) -> dict:
    v = median.values
    v = v[np.isfinite(v)]
    if v.size == 0:
        return {"piksellar": 0}
    p = np.percentile(v, [5, 25, 50, 75, 95])
    return {
        "piksellar": int(v.size),
        "min": round(float(v.min()), 2),
        "p5": round(float(p[0]), 2),
        "p25": round(float(p[1]), 2),
        "median": round(float(p[2]), 2),
        "p75": round(float(p[3]), 2),
        "p95": round(float(p[4]), 2),
        "max": round(float(v.max()), 2),
    }


def yozish(da: xr.DataArray, yol: Path, nodata):
    import rioxarray  # noqa: F401  (.rio accessor)

    da = da.rio.write_crs(CRS)
    da = da.rio.write_nodata(nodata, encoded=False)
    da.rio.to_raster(yol, driver="COG", compress="DEFLATE")


WEB_QADAM = 0.001  # gradus (~84 m sharq-g'arb, ~111 m shimol-janub) — Landsat haqiqiy 100 m ga yaqin


def web_chiqish(tif: Path, bbox, meta: dict, chiqish: Path, hudud: str = "toshkent") -> None:
    """Joyshunos uchun ixcham to'r: EPSG:4326, WEB_QADAM, uint16 LE = round((°C+50)*100), 0 = yo'q.
    0-qator — shimol. Indeks: <hudud>_index.json (yillar ro'yxati bilan)."""
    import rasterio
    from rasterio.transform import from_origin
    from rasterio.warp import Resampling, reproject

    chiqish.mkdir(parents=True, exist_ok=True)
    w, s, e, n = bbox
    nx, ny = round((e - w) / WEB_QADAM), round((n - s) / WEB_QADAM)
    dst = np.full((ny, nx), np.nan, "float32")
    with rasterio.open(tif) as src:
        reproject(
            rasterio.band(src, 1), dst,
            src_transform=src.transform, src_crs=src.crs, src_nodata=np.nan,
            dst_transform=from_origin(w, n, WEB_QADAM, WEB_QADAM), dst_crs="EPSG:4326",
            dst_nodata=np.nan, resampling=Resampling.average,
        )
    q = np.where(np.isfinite(dst), np.clip(np.round((dst + 50) * 100), 1, 65535), 0).astype("<u2")
    yil = meta["yil"]
    fayl = f"{hudud}_{yil}.bin"
    (chiqish / fayl).write_bytes(q.tobytes())
    ix_yol = chiqish / f"{hudud}_index.json"
    ix = json.loads(ix_yol.read_text(encoding="utf-8")) if ix_yol.exists() else {}
    ix.update({
        "hudud": hudud, "bbox": [w, s, e, n], "nx": nx, "ny": ny, "qadam": WEB_QADAM,
        "kodlash": "uint16 LE, (°C+50)*100, 0 = yo'q, 0-qator shimol",
        "manba": "Landsat 8/9 Collection 2 Level-2 ST_B10 (USGS), Microsoft Planetary Computer",
        "piksel_m": 100, "davr": "iyun–avgust medianasi",
    })
    ix.setdefault("yillar", {})[str(yil)] = {
        "fayl": fayl, "N": meta["tasvirlar_soni_N"], "sahna": meta["sahnalar_soni"],
        "qamrov": meta["qamrov_ulushi"], "median": meta["statistika_C"].get("median"),
    }
    ix["yillar"] = dict(sorted(ix["yillar"].items()))
    ix_yol.write_text(json.dumps(ix, ensure_ascii=False, indent=1), encoding="utf-8")


def bir_yil(yil: int, bbox, bulut_max: float, chiqish: Path) -> dict:
    print(f"[{yil}] sahnalar izlanmoqda...", flush=True)
    sahnalar = sahnalarni_izlash(yil, bbox, bulut_max)
    if not sahnalar:
        print(f"[{yil}] mos sahna topilmadi - o'tkazib yuborildi", file=sys.stderr)
        return {"yil": yil, "xato": "sahna topilmadi"}
    print(f"[{yil}] {len(sahnalar)} ta sahna topildi, yuklanmoqda...", flush=True)

    ds = yuklash(sahnalar, bbox)
    c = dn_dan_selsiy(ds["lwir11"], ds["qa_pixel"])
    median, soni = yoz_medianasi(c)
    median, soni = median.compute(), soni.compute()

    kunlar = int(ds.sizes["time"])
    stat = statistika(median)
    qamrov = float(np.isfinite(median.values).mean())

    chiqish.mkdir(parents=True, exist_ok=True)
    tif = chiqish / f"lst_yoz_{yil}.tif"
    tif_soni = chiqish / f"lst_yoz_{yil}_soni.tif"
    yozish(median, tif, np.nan)
    yozish(soni, tif_soni, 0)

    meta = {
        "yil": yil,
        "davr": f"{yil}-06-01/{yil}-08-31",
        "manba": "Landsat Collection 2 Level-2, ST_B10 (Microsoft Planetary Computer)",
        "kattalik": "sirt harorati, °C, yozgi median",
        "piksel_haqiqiy_m": 100,
        "piksel_fayl_m": PIKSEL_M,
        "crs": CRS,
        "bbox_wgs84": list(bbox),
        "tasvirlar_soni_N": kunlar,
        "sahnalar_soni": len(sahnalar),
        "sahnalar": sorted(s.id for s in sahnalar),
        "bulut_max_sahna_foiz": bulut_max,
        "kuzatuv_soni_piksel_median": int(np.median(soni.values)),
        "qamrov_ulushi": round(qamrov, 4),
        "statistika_C": stat,
        "yaratildi": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    (chiqish / f"lst_yoz_{yil}.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    web_chiqish(tif, bbox, meta, chiqish / "web")

    print(
        f"[{yil}] tayyor: N={kunlar} kun ({len(sahnalar)} sahna), qamrov {qamrov:.1%}, "
        f"median {stat.get('median')} °C, p5-p95 {stat.get('p5')}...{stat.get('p95')} °C -> {tif}",
        flush=True,
    )
    return meta


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Landsat yozgi sirt harorati (iyun-avgust medianasi)")
    ap.add_argument("--yillar", required=True, help="2025 | 2013-2025 | 2015,2020,2025")
    ap.add_argument("--chiqish", default="natija", help="natija papkasi (standart: ./natija)")
    ap.add_argument(
        "--bbox",
        default=",".join(str(v) for v in TOSHKENT_BBOX),
        help="lon_min,lat_min,lon_max,lat_max (standart: Toshkent)",
    )
    ap.add_argument("--bulut-max", type=float, default=60.0, help="sahna bulutliligi chegarasi, %%")
    a = ap.parse_args(argv)

    yillar = yillarni_ochish(a.yillar)
    bbox = tuple(float(v) for v in a.bbox.split(","))
    if len(bbox) != 4:
        ap.error("--bbox 4 ta son bo'lishi kerak")
    chiqish = Path(a.chiqish)

    xulosa = []
    for y in yillar:
        try:
            xulosa.append(bir_yil(y, bbox, a.bulut_max, chiqish))
        except Exception as e:  # bir yil xatosi boshqalarini to'xtatmasin
            print(f"[{y}] XATO: {type(e).__name__}: {e}", file=sys.stderr)
            xulosa.append({"yil": y, "xato": f"{type(e).__name__}: {e}"})

    xatolar = [x for x in xulosa if "xato" in x]
    print(f"\nYakun: {len(xulosa) - len(xatolar)} yil tayyor, {len(xatolar)} xato.")
    return 1 if xatolar else 0


if __name__ == "__main__":
    sys.exit(main())
