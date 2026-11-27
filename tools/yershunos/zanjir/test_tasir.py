"""Sintetik sinov: javobi oldindan ma'lum holatlar."""
import numpy as np, rasterio, geopandas as gpd, tempfile, os
from rasterio.transform import from_origin
from rasterio.warp import transform as tfm
from shapely.geometry import box
import tasir

UTM = "EPSG:32642"
E0, N0 = 560000.0, 4610000.0            # Chorvoq atrofi, UTM 42N
tr = from_origin(E0, N0, 30, 30)          # 200x200 katak = 6x6 km
xavf = np.zeros((200, 200), "float32")
xavf[:, :100] = 1.0                        # g'arbiy yarmi: 1 m suv
xavf[:, :20] = 2.0                         # eng g'arbiy 600 m: 2 m

# aholi: Mollweide 100 m, har katakda 10 kishi, domenni ortig'i bilan qamraydi
mx, my = tfm(UTM, "ESRI:54009", [E0 + 3000], [N0 - 3000])
ptr = from_origin(round(mx[0] - 15000, -2), round(my[0] + 15000, -2), 100, 100)
d = tempfile.mkdtemp(); pp = os.path.join(d, "pop.tif")
with rasterio.open(pp, "w", driver="GTiff", height=300, width=300, count=1, dtype="float32",
                   crs="ESRI:54009", transform=ptr, nodata=-200) as ds:
    ds.write(np.full((300, 300), 10, "float32"), 1)

r = tasir.aholi_xavfda(xavf, tr, UTM, pp, chegara=0.1)
print("aholi:", r)
# kutilgan: xavf maydoni 3x6 km = 18 km2 -> 1800 katak x 10 = 18 000 (proyeksiya farqi ~1-2 %)
assert abs(r["aholi_xavfda"] - 18000) / 18000 < 0.03, r

# birliklar: g'arbiy va sharqiy yarim
b = gpd.GeoDataFrame({"nom": ["Gʻarb", "Sharq"]},
    geometry=[box(E0, N0 - 6000, E0 + 3000, N0), box(E0 + 3000, N0 - 6000, E0 + 6000, N0)], crs=UTM)
j = tasir.birliklar_boyicha(xavf, tr, UTM, pp, b)
print("birliklar:", j)
assert j[0]["nom"] == "Gʻarb" and j[0]["ulush"] > 0.95 and j[1]["ulush"] < 0.05

# binolar: 2 m zonada 1 ta, 1 m zonada 2 ta, quruqda 2 ta, chegarada 1 ta (all_touched -> suvda)
def uy(e, n, s=12): return box(E0 + e, N0 - n - s, E0 + e + s, N0 - n)
g = gpd.GeoDataFrame(geometry=[uy(300, 300), uy(1500, 900), uy(2400, 3000), uy(4000, 1000), uy(5500, 5000),
                               uy(2994, 2000)], crs=UTM)
x, m = tasir.binolar_xavfda(g, xavf, tr, UTM)
print("binolar:", x, m)
assert x["suvda"] == 4 and x["chuqur"] == 1 and x["orta"] == 3 and x["sayoz"] == 0

q = tasir.bino_manbasi_qamrovi(g.iloc[:3], (xavf > 0).astype("float32"), tr, UTM)
print("qamrov:", q)
print("OK")
