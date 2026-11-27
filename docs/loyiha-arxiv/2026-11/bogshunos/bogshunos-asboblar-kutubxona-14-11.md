# Bogʻshunos — asboblar, hisoblar va elementlar kutubxonasi sxemasi (14.11.2026)

Bogʻliq: `claude/bogshunos-metodika-bosqichlar-14-11.md` (metodika, normalar), `claude/topshiriq-bogshunos-14-11.md`, `claude/binokor-bogshunos-2-bosqich-14-11.md` 3.4 (elementlar va generatorlar dastlabki roʻyxati), `claude/chizmadon-src/landshaft-albomi-la.js` (varaqlar).
Belgilar: **N** — norma asl matndan oʻqilgan; **P** — tekshirilsin; **TALQIN** — taklif. Normalar raqamlari — metodika hujjatidan, bu yerda faqat havola.

Tasdiqlangan (Iskandar, 14.11, 10:01): zid normalarda tarmoq va nasosni oʻlchash uchun kattasi, reyestrda hammasi; tashrifchi ichimlik suvi — 3 l/kishi proksi (P); kanvas ekranlari A–F.

---

## 1. Tamoyillar
1. **Muharrir asosiy.** Har asbob — foydalanuvchi chizadi yoki tanlaydi; vosita darhol hisoblaydi va tekshiradi. «Taklif qil» — faqat tanlangan qismga, 2–3 variant, qabul qilingach oddiy element.
2. **Bitta model.** Har element kutubxona yozuviga havola qiladi (`libId`) + oʻz geometriyasi + oʻz parametrlari. Hisoblar faqat modeldan; varaqlar ham modeldan (rasm emas).
3. **Hisoblar umumiy modulda** — Master reja bilan bitta: `loads.ts` (suv, oqova, elektr, yomgʻir, chiqindi), `cost.ts` (CAPEX/OPEX mediana), `checks.ts` (norma qoidalari reyestri). Bogʻshunos oʻz kodini yozmaydi, qator qoʻshadi.
4. **Har natija qatori:** qiymat, birlik, formula, manba (`N` havola yoki `P`), daraja (konsepsiya / loyiha).
5. **Agent (Maslahatchi)** faqat shu asboblarni chaqiradi; har chaqiruv tarixda; qaytarish mumkin.

---

## 2. Asboblar — qadamlar boʻyicha

Ustunlar: **Asbob** — nima qiladi; **Kirish** — foydalanuvchi; **Hisob** — vosita; **Tekshiruv** — qoida (metodika boʻlimi); **Chiqish**.

### I. Tahlil
| № | Asbob | Kirish | Hisob | Tekshiruv | Chiqish |
|---|---|---|---|---|---|
| 1.1 | Hudud chegarasi | poligon chizish / import (DXF, GeoJSON) / Master rejadan (qulf) | maydon (Gauss), perimetr | — | `site` |
| 1.2 | Bogʻ turi va rejim | roʻyxat: shahar bogʻi, tuman bogʻi, xiyobon, skver, hovli, oʻrmon bogʻi, shahar tashqarisi… | `q` (501 / 464-band), minimal maydon (481, 490) | maydon ≥ minimal (N) | `program.kind` |
| 1.3 | Normalar toʻplami | mamlakat (UZ asosiy; RU/CN/US taqqoslash) | — | — | `normSet` |
| 2.1 | Atrof halqalari | 300 m / 10 daq / 1 km (Joyshunosdan) | aholi `P_atrof`, yashil tanqislik, bekatlar, maktablar | SanQvaN 0339-16 53-band yetib borish ≤ 15/20 daq (N) | atrof xaritasi |
| 2.2 | Atrof tarmoqlari | import yoki belgilash: TP, suv, kanalizatsiya, ariq | ulanish nuqtalari va masofasi | — | `utilNodes` |
| 3.1 | Relyef | DEM import / nuqtalar | nishab, D8 oqim, past nuqtalar | 55-jadval nishablar (N) | relyef qatlamlari |
| 3.2 | Mavjud daraxtlar | nuqta + tur + diametr + holat | soni, saqlanadiganlar | 480-band — saqlash (N) | `existingTrees` |
| 3.3 | Quyosh, shamol, shovqin | sana/vaqt; EPW; koʻchadan masofa | soya xaritasi, shamol guli, shovqin zonasi | 24.1-jadval 45/60 dBA (N) | iqlim qatlamlari |
| 3.4 | Mavjud tarmoqlar va zonalar | chiziq + tur (+ kuchlanish) | muhofaza buferi | 35-jadval, 199-band, VMQ 1050 14-band (N); suv muhofaza zonasi — foydalanuvchi kengligi (amaldagi nizom yoʻq, P) | `constraints` |
| 4.1 | Moslik xaritasi | faoliyat tanlash; vaznlar slayderi | `S = Σ wᵢ·Lᵢ` (McHarg), qizil/sariq/yashil | VMQ 1050 15(g): ELU zonasida bolalar va sport — qizil (N) | moslik xaritasi, top-3 joy |

### II. Dastur va gʻoya
| № | Asbob | Kirish | Hisob | Tekshiruv | Chiqish |
|---|---|---|---|---|---|
| 5.1 | Tashrif modeli | `P_atrof`, `s`, `k` (sukut — 34-jadval), sanash CSV (ixtiyoriy) | `N₁ = min(A·q; P·s/k)`, `N_kun = min(P·s; A·q·k)` | 502-band ogohlantirishlari (N) | `visitors` — barcha yuklamalar manbai |
| 5.2 | Dastur | avtomatik taklif + tahrir | 33-jadval xizmatlari, 36-jadval m²/kishi, 489-band bolalar 0,5 m²/kishi | yetishmovchilik qizil (N) | dastur jadvali |
| 6.1 | Zona | poligon; tur (faol, sokin, bolalar, sport, suv, oʻrmon, oʻtloq, xizmat) | maydon, ulush, sigʻim ulushi | 491: koʻkalamzor ≥ 70 % (N); zonalar orasida bufer (TALQIN) | `zones[]` |
| 6.2 | Oʻq va yoʻl ierarxiyasi (sxematik) | chiziq + daraja | uzunlik, zichlik | — | sxema |
| 6.3 | Massiv | poligon; tip (oʻrmon, siyrak daraxtzor, oʻtloq, maysa, kserofit, gulzor) | kanopi % (0/10/20 yil), suv sinfi | — | `masses[]` |
| 6.4 | Balans va narx (kattalashtirilgan) | — | sugʻorish, ichimlik, oqova, yomgʻir, elektr; CAPEX zona × soʻm/m²; OPEX | metodika 3-boʻlim | konsepsiya TIK |
| 6.5 | Taklif qil | tanlangan zona/massiv | 2–3 variant (eski v0 yadro qismlari) | barcha tekshiruvlar | variant kartalari |

### III. Loyiha
| № | Asbob | Kirish | Hisob | Tekshiruv | Chiqish |
|---|---|---|---|---|---|
| 7.1 | Balandlik nuqtasi / gorizontal | nuqta, chiziq | sirt, nishablar | 55-jadval (N); universal dizayn 1:20 / 1:12 (ShNQ 2.07.02-24, P — oʻqilmagan) | vertikal reja |
| 7.2 | Yer ishlari | — | qazish/toʻkish m³ | 601-band nolli balans (N) | balans |
| 7.3 | Yomgʻir elementi | poligon: yomgʻir bogʻi, bioariq, quruq daryo, botqoq | `V = Σ Aᵢ·ψᵢ·h`, `h` = 65,2 mm (Toshkent, ShNQ 2.01.01-22, 12-jadval) | ushlab qolish % | yomgʻir jadvali |
| 8.1 | Yoʻlak | chiziq + daraja + material | m², bordyur m, nishab | ShNQ 24-jadval velo (N); suv muhofaza / ELU zonalari | `paths[]` |
| 8.2 | Qoplama | poligon + material | m², `ψ`, BAF | — | `surfaces[]` |
| 9.1 | Daraxt | nuqta + tur + koʻchat oʻlchami | toj 0/10/20 yil, ildiz `V = 0,6·π·r²`, soya | 35-jadval (N); trotuar 0,7 vs 1,2 m (zid → 1,2); VMQ 1050 17(v) — ELU zonasida kelishuv (N) | `trees[]` |
| 9.2 | Qator / xiyobon | chiziq + qadam + tur | soni | xuddi shu | |
| 9.3 | Buta, guruh, gulzor, matritsa | poligon + tur(lar) + zichlik | dona, m² | — | `plantings[]` |
| 9.4 | Gidrozona | avtomatik (oʻsimlik suv sinfidan) + tahrir | `Q_sut = Σ Aᵢ·nᵢ·m`; nazorat `ET_L = ET₀·K_L` (A) | 4-jadval / 65.1 / 3-ilova — kattasi (tasdiqlangan) | gidrozonalar |
| 10.1 | Suv obyekti | poligon: hovuz, favvora, ariq | hajm, aylanma suv, nasos kVt | 59–60-band yoritish ≤ 12 V, IP 68 (N) | `water[]` |
| 10.2 | Sugʻorish tizimi | manba, usul (tomchi, yomgʻirlatish, ariq) | m³/sut, quvur m, nasos kVt | 595–598-band (N) | sugʻorish sxemasi |
| 11.1 | Jihoz / MAF | nuqta + kutubxona modeli | dona, xavfsizlik zonasi | ELU zonasida bolalar/sport — taqiq (N) | `items[]` |
| 11.2 | Yoritgich | nuqta yoki chiziq boʻylab qadam | dona, kVt, lx (taxminiy) | 18-jadval lx (ShNQ 2.01.05-24, N); 41-band ≥ 3 m (N) | `lights[]` |
| 11.3 | Bino (pavilion, kafe, hojatxona) | poligon + tur | suv, oqova, kVt | hojatxona soni — RU 1/500 (A, proksi) | `buildings[]` |
| 12.1 | Tarmoq trassasi | chiziq + tur + diametr | uzunlik, kesishmalar | 35-jadval, 199-band (N); VMQ 1050 kabel 1 m (N) | `networks[]` |
| 12.2 | Ulanish | nuqta + TU sigʻimi | yuklama ≤ sigʻim | 200-band variantlar (N) | ulanishlar |

### IV. Hisob va hujjat
| № | Asbob | Hisob | Chiqish |
|---|---|---|---|
| 13.1 | Smeta | vedomost × narx kitobi (mediana, P25–P75; < 3 kuzatuv — TAXMIN) | CAPEX |
| 13.2 | Parvarish | suv, elektr, chiqindi (66.1-jadval supurindi), oʻrish, butash, xodim | OPEX/yil; 20 yillik sikl |
| 13.3 | Narx kitobi | kuzatuv qoʻshish: manba, sana, QQS, hudud | mediana |
| 14.1 | Normalar reyestri | barcha tekshiruvlar: band, qiymat, loyiha, holat (N/P/zid) | reyestr varagʻi |
| 14.2 | TIK | metodika 6-boʻlim | TIK jadvali |
| 14.3 | Kesim chizigʻi | L-03 uslubi, 5 qoʻshimcha | kesim |
| 14.4 | Render | Master reja render moduli (3D kadr) | render tarixi |
| 14.5 | Chizmadonga → | «la» oilasi varagʻiga | albom |

Har qadamda umumiy: tanlash, surish, nusxa, oʻchirish, qatlamlar, oʻlchov chizigʻi, izoh, qaytarish/qaytarishni bekor qilish, Maslahatchi buyrugʻi.

---

## 3. Elementlar kutubxonasi — sxema

Har yozuv bitta JSON. Umumiy maydonlar:
```
{
  "id": "tree.platanus-orientalis",
  "kind": "tree | shrub | perennial | grass | mass | surface | path | water | relief | item | light | building | network",
  "name": { "uz": "...", "ru": "...", "en": "...", ... },   // 10 til
  "src": [{ "ref": "manba nomi", "date": "YYYY-MM-DD", "status": "N | P | A" }],
  "cost": { "code": "ShNK 4.02 boʻlimi", "unit": "dona | m² | m | m³", "obs": [{ "sum": 0, "date": "", "src": "", "vat": true, "region": "" }] },
  "upkeep": { "unit": "...", "hoursPerYear": null, "waterClass": null },
  "symbol": { "plan": "svg id", "section": "svg id", "axo": "model id" },
  "schedule": { "row": "vedomost turi", "fields": ["..."] }
}
```

### 3.1 Oʻsimlik (`tree`, `shrub`, `perennial`, `grass`)
```
"bot": { "latin": "Platanus orientalis", "family": "...", "native": true, "invasive": false },
"size": { "nursery": [{ "label": "14–16 sm", "h": 4.0, "crown": 2.0 }],
          "growth": { "y10": { "h": null, "crown": null }, "y20": {...}, "y40": {...} } },   // P — manbadan
"crownBase": null,
"root": { "type": "chuqur | yuza", "depth": null },
"water": { "class": "VL | L | M | H", "Ks": null },          // WUCOLS (A)
"tolerance": { "salt": 0, "drought": 0, "heat": 0, "dust": 0, "shade": 0, "frostZone": null },
"allergen": 0,
"season": { "leaf": [12 oy rang], "flower": [12 oy rang] },
"spacing": { "min": null },                                  // ekish orasi
"zones": ["ELU ostida mumkin emas", ...]                      // qoidalar havolasi
```
Manbalar (Iskandar qarori): Botanika bogʻi roʻyxati, koʻchatxona kataloglari, Chirchiq loyihasi roʻyxatlari, WUCOLS, GBIF. Oʻlcham va oʻsish qiymatlari manbasiz — P.

### 3.2 Massiv (`mass`) — konsepsiya darajasi
```
"mix": [{ "id": "tree.x", "share": 0.4 }], "canopy": { "y0": 0, "y10": null, "y20": null },
"density": { "trees_per_ha": null }, "expand": "poisson | rows | matrix"   // «Loyihalash» → elementlarga yoyish
```

### 3.3 Qoplama (`surface`) va yoʻlak (`path`)
```
"psi": null,            // oqim koeffitsiyenti (P — manba tanlansin)
"baf": null,            // BAF koeffitsiyenti (Berlin, A)
"albedo": null, "maxSlope": null, "accessible": true,
"layers": [{ "name": "qoplama", "t": 0.08 }, { "name": "asos", "t": 0.25 }],   // P
"path": { "class": "asosiy | ikkinchi | soʻqmoq | velo | yugurish", "width": null }   // velo — ShNQ 24-jadval (N)
```

### 3.4 Suv (`water`), relyef (`relief`)
```
"water": { "type": "hovuz | favvora | ariq | yomgʻir bogʻi | bioariq | botqoq | quruq daryo", "depth": null, "recirc": true, "pump_kW": null },
"relief": { "type": "tepalik | terassa | amfiteatr | tirgak devor", "cutFill": true }
```

### 3.5 Jihoz, yoritgich, bino (`item`, `light`, `building`)
```
"item": { "group": "oʻyin | sport | oʻrindiq | pergola | velo | urna | navigatsiya", "age": "1–3 | 3–7 | 7–12 | 12+", "safetyZone": null, "dims": [] },
"light": { "h": null, "lm": null, "W": null, "K": 4000, "ip": null, "lowVoltage": false },   // 18, 41, 59–62-bandlar
"building": { "use": "kafe | hojatxona | pavilion | xizmat", "water_l": null, "kW": null, "fixtures": null }
```

### 3.6 Tarmoq (`network`)
```
"net": { "type": "suv | oqova | yomgʻir | sugʻorish | elektr 0,4 | elektr 10 | aloqa | gaz", "dn": null, "depth": null,
         "zone": { "rule": "VMQ 1050 14(b) | 35-jadval", "m": null } }
```

---

## 4. Maʼlumot modeli (loyiha fayli)
```
project.bogshunos = {
  mode: "alohida | masterReja", level: "konsepsiya | loyiha", normSet: "UZ", lang: "uz",
  site, program, visitors, constraints, utilNodes, existingTrees,
  zones[], masses[], paths[], surfaces[], trees[], plantings[], water[], relief[],
  items[], lights[], buildings[], networks[], sections[], renders[],
  priceBook, register[], history[]
}
```
Master reja rejimida: `site`, aholi va binolar — Master rejadan (faqat oʻqish); `loads` va `cost` qatorlari Master reja TEP iga qoʻshiladi.

---

## 5. Kod navbati (kod chati uchun, bittadan PR)
1. **PR-1** `loads.ts` / `cost.ts` / `checks.ts` ga Bogʻshunos qatorlari: tashrif modeli, sugʻorish (uch normali ziddiyat — kattasi), ichimlik (3 l/kishi, P), yomgʻir, yoritish; testlar metodika misollari bilan (kanvas D: 498–664 m³/sut; 1 420 kishi; 160 yoritgich).
2. **PR-2** Kutubxona sxemasi + 20 ta boshlangʻich yozuv (daraxt 8, buta 4, qoplama 4, jihoz 4) — oʻlchamlar P belgisi bilan.
3. **PR-3** Muharrir qobigʻi: 14 qadam paneli (4 blok), 1.1, 6.1, 6.3 asboblari, balans paneli.
4. **PR-4** 4-qadam moslik xaritasi va cheklovlar (35-jadval, VMQ 1050).
5. **PR-5** 9-qadam daraxt asbobi + tekshiruvlar + gidrozona.
6. **PR-6** Kesim (L-03) va «Chizmadonga →» (la oilasi).
Har PR: 10 til, tungi rejim, 1024 px, interfeys yengil.

## 6. Ochiq qiymatlar — qidiruv natijasi (14.11, 10:30)

### 6.1 Qoplamalar oqim koeffitsiyenti — TOPILDI (N)
QMQ 2.04.03-19 «Kanalizatsiya. Tashqi tarmoqlar» (papkada; yangi SHNQ 2.04.03-24 papkada yoʻq), 2.17-band, 9-jadval — yuzani tavsiflovchi **z** koeffitsiyenti (choʻqqi sarf hisobi uchun):
| Yuza | z |
|---|---|
| Tom, asfalt-beton qoplama | 10-jadval: A parametriga qarab 0,32 (A = 300) … 0,23 (A = 1500) |
| Chaqiq tosh va shagʻalli qora yoʻl | 0,224 |
| Tosh yotqizilgan yoʻllar | 0,145 |
| Bogʻlovchisiz shagʻal qoplama | 0,125 |
| **Istirohat bogʻlarining shagʻalli yoʻlkalari** | **0,09** |
| Tuproq yuzalar (tekislangan) | 0,064 |
| **Maysazorlar** | **0,038** |
- 2.18-band: yopiq yoki ochiq kanalizatsiyasiz bogʻ va istirohat bogʻlari hududi oqim yuzasiga **qoʻshilmaydi**; koʻchaga 0,008–0,01 nishabda boʻlsa — yoʻlga tutash 50–100 m kenglikdagi yoʻlak qoʻshiladi. Dahalar ichidagi koʻkalamzor yuzalar qoʻshiladi.
- **Diqqat:** z — choʻqqi sarf (chegaraviy jadallik usuli) uchun. Hajm hisobi `V = Σ Aᵢ·ψᵢ·h` dagi yillik ψ boshqa koeffitsiyent — Bogʻshunosda hozircha z ni ψ oʻrnida ishlatmaslik; kutubxonada ikkala maydon: `z` (N) va `psi` (P).

### 6.2 Nogironlar va kekslar uchun — TOPILDI (N)
ShNQ 2.07.02-24 (Qurilish vazirligi buyrugʻi 01/2-1-son; ShNQ 2.07.02-22 oʻrniga):
- 16-band: serqatnov joylarda piyoda yoʻlkasi **≥ 2,4 m**;
- 17-band: trotuar boʻylama nishabi **≤ 5 %**, har 10–12 m da ≥ 1,5 m gorizontal maydoncha; koʻndalang nishab **2 %**; ikki sath ulanishida ≤ 10 % (1:10);
- 18-band: koʻkalamzor maydonchalar atrofidagi yoʻlkalar yerdan 5–7 sm baland, bordyur 4–5 sm, eni 10 sm; transport bilan kesishuvda bort ≤ 2 sm;
- 19-band: jamoat hududlarida yoʻlka **≥ 2,0 m**, transport koʻchalarida ≥ 2,4 m;
- 23-band: dam olish maydonchalarida **har 10 m da oʻrindiq va ichimlik favvorachasi**; yoʻlkalar boʻylab **har 100 m da** oʻrindiq, suyanchiq va urna;
- 31-band: istirohat bogʻlari va xiyobonlar kirishlarida **tezkor aloqa / yordam tugmasi**;
- 33-band: ochiq zinalar eni ≥ 1,6 m, pogʻona eni ≥ 0,3 m, balandligi ≤ 0,12 m, marshda ≥ 3 pogʻona, koʻndalang nishab 2 %;
- 42-band: pandus eni **≥ 1,0 m**, marsh balandligi **≤ 0,8 m**, boʻylama qiyalik **1:12,5**, koʻndalang 1:50;
- 15-band: dam olish, sport va bolalar maydonchalarigacha oraliq ≤ 200 m.
→ 7.1, 8.1, 11.1 tekshiruvlariga qoʻshiladi (metodikadagi «1:20 / 1:12» TALQIN oʻrniga shu qiymatlar).

### 6.3 Koʻchat oʻlchamlari — TOPILDI (A)
GOST 24909-81 (bargli daraxt koʻchatlari) va GOST 25769-83 (ignabargli), MDS 13-5.2000 (Rossiya Gosstroyi, 1999) 5–6-ilovalar orqali:
- bargli: 1-guruh 2–2,5 m (shtamb diametri 2–2,5 sm); 2-guruh 3–3,5 m (> 3 sm); 3-guruh 3,5–4 m (≥ 4,5 sm, kom 1 × 1 × 0,6 m); 4-guruh 4–5 m (≥ 5 sm, kom 1,3 × 1,3 × 0,6); 5-guruh > 5 m (≥ 7 sm, kom 1,5 × 1,5 × 0,65);
- ignabargli: tur va guruh boʻyicha balandlik, toj diametri, kom (masalan, qora qaragʻay 4-guruh 200–300 sm, toj 150 sm, kom 130 × 130 × 60).
- Shu hujjatda ekish chuqurlari (4-jadval) va qator ekish qadami (5-jadval: bir qatorli daraxt 7 m, guruh 5–7 m) — A.
- Oʻzbekiston koʻchat standarti topilmadi → kutubxonada `nursery` qatorlari GOST guruhlari bilan (A); koʻchatxona kataloglari kelganda almashtiriladi.

### 6.4 Daraxt oʻsishi (10 / 20 / 40 yil) — USUL TOPILDI (A), qiymatlar hali hisoblanmagan
USDA Forest Service «Urban Tree Database and Allometric Equations» (McPherson, van Doorn, Peper, 2016, PSW-GTR-253; maʼlumot: doi 10.2737/RDS-2016-0005): 17 shahar, 14 000 dan ortiq daraxt, 171 tur; **yosh → tana diametri → balandlik, toj diametri, toj balandligi** tenglamalari, 16 iqlim mintaqasi boʻyicha.
- Bogʻshunosda (TALQIN): Toshkentga iqlimi yaqin mintaqa tenglamalari (quruq, issiq yoz) → PR-2 da tur boʻyicha 10/20/40 yil qiymatlari; har qiymat yonida «A, UTD, mintaqa X». Mahalliy oʻlchov kelganda kalibrlanadi.
- Kesim E (L-03) dagi chinor/sofora/tol balandliklari hozircha P.

### 6.5 Chetdan olindi (A) — Iskandar qarori 14.11, 10:18: «bizda yoʻq boʻlsa chetdan kirit»
- **Toj va sim masofasi — Rossiya PUE-7, 2.5.207-band** (Oʻzbekiston EUQ matni topilmagani uchun): bogʻlar, qoʻriqxonalar, aholi punktlari atrofidagi yashil zonalarda simlar eng koʻp ogʻganda tojgacha gorizontal masofa **≥ 3 m (≤ 20 kV), ≥ 4 m (35–110 kV), ≥ 5 m (150–220 kV), ≥ 6 m (330–500 kV)**; balandligi 4 m gacha boʻlgan daraxtzorlarda prosek — chetki simlar orasi + har tomonga 3 m; himoyalangan simli VLZ — har tomonga 1,25 m. 1 kV gacha (PUE-7, 2.4): yalangʻoch simdan daraxtgacha ≥ 1 m, izolyatsiyalangan ≥ 0,5 m, SIP ≥ 0,3 m.
  → 9.1 tekshiruviga: daraxt tojining 20 yillik radiusi + PUE masofasi ≤ ELU oʻqidan masofa. Belgi «A, PUE-7».
- **Yillik oqim koeffitsiyenti ψ (hajm uchun)** — Rossiya NII VODGEO hisob namunasi (SP 32.13330 ga muvofiq yillik hajm usuli): tom **0,8**; asfalt qoplama va yoʻllar **0,6**; ochiq tuproq maydonchalar **0,2**; yashil maydon va maysazor **0,1**. Belgi «A»; SHNQ 2.04.03-24 topilganda almashtiriladi.
- **Koʻchat oʻlchamlari** — GOST 24909-81 / 25769-83 (6.3). Koʻchatxona narxlari — mahalliy kuzatuvlar (metodika 4.3).
- **Daraxt oʻsishi** — USDA Urban Tree Database (6.4).

### 6.6 Hali topilmadi (P) — 14.11, 10:25 qayta qidirildi
- **Suv muhofaza zonalari** — VMQ 981 kuchini yoʻqotgan (23.06.2026, VMQ 317, 2-ilova, 16-band), yangi nizom lex.uz da yoʻq; foydalanuvchi kengligi rejimi saqlanadi.
- **SHNQ 2.04.03-24** — internetda matni topilmadi (lex.uz da faqat SHNQ 2.04.13-24 «Qozonxonalar» bor — ShNQ 2.07.01-23, 240-band havolasi xatosi tasdiqlanadi).
- **Qozogʻiston yuklama normasi** — SP RK 3.01-101-2013 papkada yoʻq.
