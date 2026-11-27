"""Yershunos · suv tanqisligi: WRI Aqueduct 4.0 (HydroBASINS 6-daraja havzalari) — yuklash va O'zbekiston qismini ajratish.
Hajm cheklovi: fayl 700 MB dan katta bo'lsa yuklamaydi, faqat hajmini xabar qiladi."""
import os, sys, time, zipfile, traceback, json
HERE = os.path.dirname(os.path.abspath(__file__)); KESH = os.path.join(HERE, "kesh"); AQ = os.path.join(KESH, "aqueduct"); os.makedirs(AQ, exist_ok=True)
sys.path.insert(0, HERE)
L = []; T0 = time.time(); CHEK = 700e6
def yoz(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); L.append(s)
    open(os.path.join(HERE, "natija_aq.txt"), "w", encoding="utf-8").write("\n".join(L))
URLS = ["https://files.wri.org/aqueduct/aqueduct-4-0-water-risk-data.zip", "https://files.wri.org/d8/s3fs-public/aqueduct-4-0-water-risk-data.zip"]
BBOX = (55.5, 36.8, 73.6, 46.0)

def main():
    import requests, angren_sinov as A
    z = os.path.join(AQ, "aqueduct40.zip")
    if not os.path.exists(z):
        url = None
        for u in URLS:
            try:
                r = requests.head(u, allow_redirects=True, timeout=(20, 60)); n = int(r.headers.get("Content-Length", 0))
                yoz("HEAD", r.status_code, round(n / 1e6), "MB", u)
                if r.status_code == 200 and n > 1e6:
                    url = (u, n); break
            except Exception as e:
                yoz("HEAD xato", str(e)[:80], u)
        if not url:
            yoz("MANZIL TOPILMADI"); return
        if url[1] > CHEK:
            yoz(f"HAJM KATTA: {round(url[1] / 1e6)} MB > {round(CHEK / 1e6)} MB — yuklanmadi, ruxsat kerak"); return
        if not A.yukla(url[0], z, urinish=12):
            yoz("YUKLANMADI"); return
    yoz("zip:", round(os.path.getsize(z) / 1e6), "MB", int(time.time() - T0), "s")
    with zipfile.ZipFile(z) as zf:
        nm = zf.namelist(); yoz("ichida", len(nm), "fayl; yuqori daraja:", sorted({n.split("/")[0] + "/" + (n.split("/")[1] if "/" in n else "") for n in nm})[:20])
        csvs = [n for n in nm if n.lower().endswith(".csv")]; yoz("csv:", [(n, round(zf.getinfo(n).file_size / 1e6, 1)) for n in csvs])
        gdb = sorted({n[:n.lower().index(".gdb") + 4] for n in nm if ".gdb/" in n.lower()}); yoz("gdb:", gdb)
        if gdb:
            zf.extractall(AQ, [n for n in nm if n.startswith(gdb[0])])
    if not gdb:
        yoz("GDB yo'q"); return
    import pyogrio, geopandas as gpd
    gp = os.path.join(AQ, gdb[0]); lay = pyogrio.list_layers(gp); yoz("qatlamlar:", [list(x) for x in lay])
    for nom in [x[0] for x in lay]:
        try:
            g = gpd.read_file(gp, layer=nom, bbox=BBOX, engine="pyogrio")
            yoz(f"  {nom}: {len(g)} obyekt, {len(g.columns)} ustun; ustunlar: {list(g.columns)[:40]}")
            if len(g) and g.geometry.notna().any():
                kal = "baseline_annual" if "baseline" in nom.lower() and "annual" in nom.lower() else "future_annual" if "future" in nom.lower() else nom
                g["geometry"] = g.geometry.simplify(0.002); g.to_parquet(os.path.join(AQ, f"aq_uzb_{kal}.parquet"))
                yoz(f"  saqlandi: aq_uzb_{kal}.parquet {round(os.path.getsize(os.path.join(AQ, f'aq_uzb_{kal}.parquet')) / 1e6, 2)} MB")
        except Exception as e:
            yoz(f"  {nom}: xato {str(e)[:120]}")

if __name__ == "__main__":
    try:
        main()
    except Exception:
        yoz("XATO:\n" + traceback.format_exc()[-700:])
    yoz(f"TAYYOR · {int(time.time() - T0)} s")
