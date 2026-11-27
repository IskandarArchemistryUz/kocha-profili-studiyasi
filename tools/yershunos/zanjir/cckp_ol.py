"""World Bank CCKP (CMIP6 0,25°, ansambl medianasi) iqlim ko'rsatkichlarini yuklab olish — butun dunyo fayllari, kichik hajm.
Qo'shimcha: OSM'dan chegarasi yetishmagan shaharlar (Shirin, Termiz, Urganch, Xiva)."""
import os, re, sys, time, json, requests
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, "kesh", "cckp"); os.makedirs(D, exist_ok=True)
L = []
def yoz(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); L.append(s)
    open(os.path.join(HERE, "natija_cckp.txt"), "w", encoding="utf-8").write("\n".join(L))
B = "https://wbg-cckp.s3.amazonaws.com/"
VARS = ["hd35", "hd40", "tr", "cdd", "spei12", "rx5day", "pr", "tas"]
SEN = [("historical", "1995-2014"), ("ssp245", "2040-2059"), ("ssp585", "2040-2059")]
def kalit(v, s, p):
    return f"data/cmip6-x0.25/{v}/ensemble-all-{s}/climatology-{v}-annual-mean_cmip6-x0.25_ensemble-all-{s}_climatology_median_{p}.nc"
def yukla(url, yol):
    for u in range(1, 9):
        try:
            bor = os.path.getsize(yol + ".qism") if os.path.exists(yol + ".qism") else 0
            with requests.get(url, headers={"Range": f"bytes={bor}-"} if bor else {}, stream=True, timeout=(20, 120)) as r:
                if r.status_code == 404:
                    return 404
                if r.status_code not in (200, 206):
                    yoz("   HTTP", r.status_code); time.sleep(5); continue
                if r.status_code == 200:
                    bor = 0
                with open(yol + ".qism", "ab" if bor else "wb") as f:
                    for b in r.iter_content(1 << 16):
                        f.write(b)
            jami = int(r.headers.get("Content-Range", "/0").split("/")[-1] or 0) or int(r.headers.get("Content-Length", 0)) + bor
            if jami and os.path.getsize(yol + ".qism") < jami:
                yoz("   to'liq emas, davom", u); continue
            os.replace(yol + ".qism", yol); return 200
        except Exception as e:
            yoz("   uzildi", u, str(e)[:70]); time.sleep(5)
    return 0
ok = 0; t0 = time.time()
for v in VARS:
    for s, p in SEN:
        nom = f"{v}_{s}_{p}.nc"; yol = os.path.join(D, nom)
        if os.path.exists(yol) and os.path.getsize(yol) > 10000:
            ok += 1; yoz(nom, "bor", os.path.getsize(yol) // 1024, "KB"); continue
        k = yukla(B + kalit(v, s, p), yol)
        if k == 200:
            ok += 1; yoz(nom, "yuklandi", os.path.getsize(yol) // 1024, "KB", f"({int(time.time() - t0)} s)")
        elif k == 404:                              # nom boshqacha bo'lsa: papkadagi fayllar ro'yxati
            yoz(nom, "404 — papka ro'yxati:")
            try:
                x = requests.get(B, params={"list-type": "2", "prefix": f"data/cmip6-x0.25/{v}/ensemble-all-{s}/", "max-keys": "400"}, timeout=(20, 60)).text
                ks = [m for m in re.findall(r"<Key>([^<]+)</Key>", x) if "climatology" in m and "annual" in m and "median" in m]
                for m in ks[:12]:
                    yoz("    ", m)
                mos = [m for m in ks if p in m]
                if mos and yukla(B + mos[0], yol) == 200:
                    ok += 1; yoz("   muqobil nom bilan yuklandi:", mos[0], os.path.getsize(yol) // 1024, "KB")
            except Exception as e:
                yoz("    ro'yxat olinmadi:", str(e)[:80])
        else:
            yoz(nom, "YUKLANMADI")
yoz(f"CCKP: {ok}/{len(VARS) * len(SEN)} fayl, {int(time.time() - t0)} s")

# --- OSM: chegarasi yetishmagan shaharlar (ixtiyoriy; muvaffaqiyatsiz bo'lsa davom etadi) ---
Q = '[out:json][timeout:120];area["ISO3166-1"="UZ"]->.a;(relation(area.a)["boundary"="administrative"]["admin_level"~"^(7|8|9)$"]["name"~"Shirin|Termiz|Urganch|Urgench|Xiva|Khiva|Ширин|Термез|Ургенч|Хива"];relation(area.a)["place"~"city|town"]["name"~"Shirin|Termiz|Urganch|Xiva"];);out geom;'
yol = os.path.join(HERE, "kesh", "osm_shaharlar.json")
if not os.path.exists(yol):
    for u, url in enumerate(["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"] * 2):
        try:
            r = requests.post(url, data={"data": Q}, timeout=(30, 180))
            if r.status_code == 200 and "elements" in r.text[:200000]:
                d = r.json(); open(yol, "w", encoding="utf-8").write(r.text)
                yoz("OSM shaharlar:", len(d["elements"]), "element:", [(e.get("tags", {}).get("name"), e.get("tags", {}).get("admin_level")) for e in d["elements"]][:20]); break
            yoz("OSM HTTP", r.status_code, url.split("/")[2]); time.sleep(10)
        except Exception as e:
            yoz("OSM uzildi:", str(e)[:70]); time.sleep(10)
else:
    yoz("OSM shaharlar: bor")
yoz("TAYYOR")
