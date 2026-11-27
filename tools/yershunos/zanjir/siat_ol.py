"""Yershunos · zaiflik ko'rsatkichlari: SIAT (stat.uz) to'plamlarini yuklaydi va qaysi birida tuman kesimi borligini xabar qiladi.
Har so'rov orasida 1 s tanaffus; mavjud fayl qayta yuklanmaydi."""
import os, json, time, requests
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, "kesh", "stat"); os.makedirs(D, exist_ok=True)
IDS = {2631: "ichimlik suvi (kvartira)", 1242: "kanalizatsiya", 1243: "tabiiy gaz", 3196: "issiq suv", 3197: "issiqlik", 3198: "uy-joy bilan ta'minlanish", 1244: "uy-joy fondi maydoni", 1245: "kvartiralar soni",
       1260: "paxsa devor", 1257: "xom g'isht devor", 1256: "pishiq g'isht devor", 603: "asosiy ichimlik suvi (uy xo'jaligi)", 619: "xavfsiz ichimlik suvi", 2764: "sanitariya",
       500: "o'rtacha ish haqi (yillik)", 1875: "ishsizlik darajasi", 1737: "kam ta'minlangan ulushi", 3495: "kambag'allik darajasi",
       561: "0-2 yosh", 2838: "3-5 yosh", 589: "6-7 yosh", 600: "8-15 yosh", 1190: "60-64 yosh", 1191: "65+ yosh", 4697: "o'rtacha yosh", 2835: "mehnatga layoqatli yosh",
       223: "tug'ilganlar", 586: "go'daklar o'limi koeff.", 238: "ko'chib kelganlar", 239: "ko'chib ketganlar", 248: "shahar aholisi", 247: "qishloq aholisi",
       3193: "shifokorlar /10 000", 3194: "shifoxona o'rinlari /10 000", 2846: "shifokorlar soni", 1432: "shifoxona o'rinlari", 1440: "o'quvchilar soni", 829: "maktablar soni",
       1420: "MTT o'rinlari", 1413: "MTT tarbiyalanuvchilar", 767: "MTT qamrovi 3-6 yosh", 1377: "pensiya oluvchilar /10 000", 236: "aholi zichligi"}
L = []
def yoz(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); L.append(s)
    open(os.path.join(HERE, "natija_siat.txt"), "w", encoding="utf-8").write("\n".join(L))
H = {"User-Agent": "Mozilla/5.0"}; T0 = time.time(); X = {}
for i, nom in IDS.items():
    p = os.path.join(D, f"{i}.json")
    if not os.path.exists(p):
        for u in range(3):
            try:
                r = requests.get(f"https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_{i}.json", headers=H, timeout=(20, 120))
                if r.status_code == 200 and len(r.content) > 300:
                    open(p, "wb").write(r.content)
                else:
                    yoz(i, nom, "→ HTTP", r.status_code, len(r.content))
                break
            except Exception as e:
                if u == 2: yoz(i, nom, "uzildi:", str(e)[:70])
                time.sleep(3)
        time.sleep(1)
    if not os.path.exists(p): continue
    try:
        d = json.load(open(p, encoding="utf-8")); d = d[0] if isinstance(d, list) else d
        rows = d.get("data", []); ys = sorted(k for k in (rows[0] if rows else {}) if k[:4].isdigit())
        tum = sum(1 for r in rows if "tuman" in str(r.get("Klassifikator", "")).lower())
        md = {m.get("name_en", ""): m.get("value_uz", "") for m in d.get("metadata", [])}
        ob = next((v for k, v in md.items() if "unit" in k.lower()), "")
        X[i] = {"nom": nom, "qator": len(rows), "tuman": tum, "yil": [ys[0], ys[-1]] if ys else [], "birlik": ob}
        yoz(f"{i} · {nom}: {len(rows)} qator, tuman {tum}, {ys[0] if ys else '-'}–{ys[-1] if ys else '-'}, birlik: {str(ob)[:40]}, {os.path.getsize(p) // 1024} KB")
    except Exception as e:
        yoz(i, nom, "o'qilmadi:", str(e)[:70])
json.dump(X, open(os.path.join(D, "siat_xulosa.json"), "w", encoding="utf-8"), ensure_ascii=False)
yoz("tuman kesimi bor:", sorted(i for i, v in X.items() if v["tuman"] > 100))
yoz(f"TAYYOR · {int(time.time() - T0)} s")
