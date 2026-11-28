# Test J: «Sohil boʻyi» referensi (IMG_1571) → Bozsuv boʻyi parki, Toshkent (Ko'rgazma ko'chasi, UzExpo qarshisi)
# Markaz 41.3385 N, 69.2760 E; x — sharq, y — shimol, metr. Manba: OSM Overpass 14.11.2026; relyef SRTM 30 m (OpenTopoData).
import json, math
import numpy as np
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union
from scipy.interpolate import RegularGridInterpolator

C = json.load(open("/home/claude/gen/j/ctx_bozsu.json"))
def G(kind): return [x for x in C if x[0] == kind]

PARK = Polygon(G("le:park")[0][3]).buffer(0)
RIVER = LineString(G("wa:river")[0][3])
WATER_W = 16.0                                  # P — OSM'da suv poligoni yoʻq; sunʼiy yoʻldosh/geodeziya bilan
WATER = RIVER.buffer(WATER_W / 2, cap_style=2)
BANK = RIVER.buffer(-26, single_sided=True)     # shimoli-gʻarbiy qirgʻoq (daryo oqimi bo'yicha o'ng tomon)
SITE = unary_union([PARK, BANK.intersection(PARK.buffer(30).envelope).intersection(PARK.buffer(35))]).difference(WATER.buffer(0.01))
SITE = max(getattr(SITE, "geoms", [SITE]), key=lambda g: g.area).buffer(0)
WOOD = unary_union([Polygon(x[3]).buffer(0) for x in G("na:wood") if len(x[3]) > 3]).intersection(SITE)
WATER_EDGE = SITE.boundary.intersection(WATER.buffer(0.6))       # suv cheti (sohil chizigʻi)

BUILD = [Polygon(x[3]).buffer(0) for x in C if x[0].startswith("bu:") and len(x[3]) > 3]
ROADS = [(x[0], x[1], LineString(x[3])) for x in C if x[0] in ("hi:trunk", "hi:tertiary", "hi:living_street", "hi:secondary", "hi:service", "hi:residential") and len(x[3]) > 1]
FOOT = [LineString(x[3]) for x in C if x[0] in ("hi:footway", "hi:pedestrian", "hi:steps") and len(x[3]) > 1]
BRIDGE = Polygon(G("ma:bridge")[0][3]).buffer(0)

# Relyef: SRTM 30 m, 25 m setka (aniqlik ±2–5 m — P, geodeziya kerak)
_d = json.load(open("/home/claude/gen/j/dem.json"))
_xs = sorted(set(p[0] for p in _d["pts"])); _ys = sorted(set(p[1] for p in _d["pts"]))
_E = np.array(_d["el"], dtype=float).reshape(len(_xs), len(_ys))
_ip = RegularGridInterpolator((_xs, _ys), _E, bounds_error=False, fill_value=None)
def Z(x, y): return float(_ip((x, y)))

# Tashqi jalb nuqtalari (OSM) — vaznlar P (sanoq bilan; Iskandar: «oqim bilan bogʻliq»)
ATTR = {
    "Kichik Halqa koʻprigi / bekat": ((-100, -84), 4.0),     # footway + bridge, Semashko bekati
    "Akmal Poʻlat koʻchasi (mahalla)": ((-37, 83), 3.0),     # living_street → Koʻrgazma
    "Usta Shirin koʻchasi": ((84, 237), 3.0),                # tertiary → Koʻrgazma
    "Shimoli-sharq (Usta Shirin mahallasi)": ((300, 318), 2.0),
    "Koʻrgazma k. — mahalla (j.)": ((-95, 0), 1.5),
    "Koʻrgazma k. — mahalla (sh.)": ((20, 150), 1.5),
}

if __name__ == "__main__":
    print("park", round(PARK.area), "site", round(SITE.area), "wood", round(WOOD.area), "water edge", round(WATER_EDGE.length))
    zs = [Z(x, y) for x, y in SITE.exterior.coords]
    print("z", round(min(zs), 1), round(max(zs), 1))
    for k, (p, w) in ATTR.items(): print(k, round(SITE.exterior.distance(Point(p)), 1), round(Z(*p), 1))
