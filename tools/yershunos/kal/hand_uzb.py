# Kichik soylar bo'yi zonasi (HAND ≤ 5 m) butun respublika: dem10 (~118 m) → priority-flood → oqim → o'zan (≥ 1 km²) → HAND.
# Chiqish: hand_zona.tif (uint8: 0 yo'q, 1 kichik soy 1–500 km² bo'yi, 2 yirik daryo >500 km² bo'yi, 3 tekis — hisoblanmaydi)
import sys, math, time, heapq, numpy as np, rasterio
from numba import njit
from scipy.ndimage import uniform_filter
SRC, CHIQ = sys.argv[1], sys.argv[2]; t0 = time.time()
ds = rasterio.open(SRC); z = ds.read(1).astype(np.float32); H, W = z.shape; RES = ds.transform.a
R = 6378137.0; ys = ds.transform.f - (np.arange(H) + 0.5) * RES; lat = np.degrees(2 * np.arctan(np.exp(ys / R)) - math.pi / 2); kc = np.cos(np.radians(lat)).astype(np.float32)   # yer masshtabi
z[z < -400] = -400
print('to\'r', W, H, round(time.time() - t0), 's', flush=True)
@njit(cache=True)
def suv(z, kc, RES):
    H, W = z.shape; n = H * W; zf = z.ravel().copy(); d = np.full(n, -1, np.int32); vis = np.zeros(n, np.uint8); order = np.empty(n, np.int32); k = 0
    heap = [(np.float32(0.0), np.int32(0))]; heap.pop()
    for x in range(W):
        for y in (0, H - 1):
            c = y * W + x
            if vis[c] == 0: vis[c] = 1; heapq.heappush(heap, (zf[c], np.int32(c)))
    for y in range(H):
        for x in (0, W - 1):
            c = y * W + x
            if vis[c] == 0: vis[c] = 1; heapq.heappush(heap, (zf[c], np.int32(c)))
    dxs = (-1, 0, 1, -1, 1, -1, 0, 1); dys = (-1, -1, -1, 0, 0, 1, 1, 1)
    while len(heap) > 0:
        e, c = heapq.heappop(heap); order[k] = c; k += 1; y = c // W; x = c - y * W
        for j in range(8):
            xx = x + dxs[j]; yy = y + dys[j]
            if xx < 0 or yy < 0 or xx >= W or yy >= H: continue
            m = yy * W + xx
            if vis[m]: continue
            vis[m] = 1; d[m] = c
            if zf[m] <= e: zf[m] = e + np.float32(0.01)
            heapq.heappush(heap, (zf[m], np.int32(m)))
    acc = np.empty(n, np.float32)                       # km²
    for y in range(H):
        a = (RES * kc[y]) ** 2 / 1e6
        for x in range(W): acc[y * W + x] = a
    for i in range(n - 1, -1, -1):
        c = order[i]
        if d[c] >= 0: acc[d[c]] += acc[c]
    base = np.full(n, -1, np.int32)
    for i in range(n):
        c = order[i]
        if acc[c] >= 1.0: base[c] = c
        elif d[c] >= 0: base[c] = base[d[c]]
    return acc, base
acc, base = suv(z, kc, RES); print('oqim tayyor', round(time.time() - t0), 's', flush=True)
zv = z.ravel(); ok = base >= 0; bi = np.where(ok, base, 0); hand = np.where(ok, zv - zv[bi], 9999).astype(np.float32); ab = np.where(ok, acc[bi], 0)
# tekislik: 25×25 katak (~3 km) ichida o'rtacha qiyalik < 0,5°
gy, gx = np.gradient(z); gx /= (RES * kc[:, None]); gy /= (RES * kc[:, None]); sl = np.degrees(np.arctan(np.hypot(gx, gy))); slm = uniform_filter(sl, 25)
zona = np.zeros(H * W, np.uint8); m5 = hand <= 5
zona[m5 & (ab <= 500)] = 1; zona[m5 & (ab > 500)] = 2; zona[(slm.ravel() < 0.5) & (zona > 0)] = 3
zona = zona.reshape(H, W); zona[z <= -400] = 0
prof = ds.profile.copy(); prof.update(dtype='uint8', nodata=None, compress='deflate', predictor=1)
with rasterio.open(CHIQ, 'w', **prof) as o: o.write(zona, 1)
np.save(CHIQ.replace('.tif', '_slm.npy'), slm.astype(np.float16)); np.save(CHIQ.replace('.tif', '_ab.npy'), ab.reshape(H, W).astype(np.float32))
print('zona ulushlari (to\'r bo\'yicha):', {k: round(float((zona == k).mean() * 100), 2) for k in (1, 2, 3)}, round(time.time() - t0), 's')
