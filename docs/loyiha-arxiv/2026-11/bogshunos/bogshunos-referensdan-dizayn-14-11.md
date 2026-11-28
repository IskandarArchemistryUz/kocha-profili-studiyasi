# Bogʻshunos — «Referensdan dizayn»: referens rasmni uchastkaga moslab loyihalash (14.11.2026)

Soʻrov (Iskandar, 14.11, 10:18): «Hudud uchastkasi boʻlsa, men referens rasm tashlasam, shuni generatsiyada moslab dizayn qilib berishini ishlab chiq; keyin test sifatida rasm beraman — real xaritada qayergadir joylaysan».
Bogʻliq: `bogshunos-asboblar-kutubxona-14-11.md` (6.5 «Taklif qil», kutubxona), `binokor-bogshunos-mexanika-14-11.md` C (agent → asbob → deterministik yadro), A6 (fasad grammatikasi — xuddi shu sxema), `render-studiyasi.md` (sodiqlik: Qatʼiy / Muvozanat / Erkin), `bogshunos-src/kernel-prototip-v0.js` (yoʻl, zona, ekish generatorlari).
Belgilar: **TALQIN** — mening taklifim; **N/A/P** — metodika hujjatidagidek.

---

## 0. Asosiy qaror (TALQIN)
- Bu — **«Taklif qil» ning kengaytmasi**, avto-generator emas: faqat soʻralganda, butun uchastka yoki tanlangan qism uchun, **2–3 variant**; qabul qilingan variant oddiy tahrirlanadigan elementlarga aylanadi (aralash yondashuv qarori saqlanadi).
- **Agent rasmni geometriyaga aylantirmaydi.** Agent (koʻruvchi model) rasmdan **dizayn grammatikasini** JSON qilib yozadi; geometriyani **deterministik generator** uchastka, cheklovlar va dastur ustida quradi. Shuning uchun natija: aniq oʻlchamli, normalarga tekshirilgan, takrorlanadigan (seed).
- Referens **ilhom manbai**: uslub, kompozitsiya, nisbatlar, materiallar. Rasmdagi loyiha aynan nusxalanmaydi (mualliflik huquqi; boshqa joy, boshqa oʻlcham).

## 1. Kirish
1. **Uchastka** — 1-qadam chegarasi (xaritada chizilgan, import yoki Master rejadan).
2. **Tahlil natijalari** — 3–4-qadam: relyef va past nuqtalar, mavjud daraxtlar (saqlanadi), kirishlar, tarmoqlar va muhofaza zonalari, moslik xaritasi.
3. **Dastur** — 5-qadam (tashrif modeli, 33-jadval xizmatlari) — referens dasturni oʻzgartirmaydi, faqat qanday joylashishini.
4. **Referens** — 1–4 ta rasm, har biri rol bilan: *Kompozitsiya* · *Uslub va materiallar* · *Oʻsimliklar* · *Kayfiyat*. Rasm turi avtomatik aniqlanadi: reja (yuqoridan), aerofoto, perspektiva/render, eskiz.
5. Ixtiyoriy matn: «suv atrofida jamlangan, sokin, mahalliy oʻsimliklar».

## 2. Referensni oʻqish → dizayn grammatikasi (agent, 1 chaqiruv)
Chiqish — JSON, har maydonda ishonch (0–1) va «rasmdan qayerda koʻrinadi» izohi:
```
{
  "type": "reja | aerofoto | perspektiva | eskiz",
  "layout": "organik | geometrik-oʻqli | toʻrli | radial | lenta | mozaika",
  "paths": { "curvature": 0.0–1.0, "hierarchy": [ "asosiy halqa", "ikkinchi", "soʻqmoq" ],
             "density_m_per_ha": null, "loop": true, "edges": "yumshoq | qatʼiy" },
  "zones": [ { "kind": "markaziy maysa | oʻrmon | oʻtloq | suv | bolalar | sport | maydon | sokin bogʻ", "share": 0.25, "position": "markaz | chet | past nuqta | kirish oldi" } ],
  "rooms": { "count": 5, "size": "kichik | oʻrta | katta", "enclosure": "daraxt | buta | relyef" },
  "canopy": { "share": 0.35, "pattern": "chet boʻylab | guruh | qator | tarqoq" },
  "water": { "present": true, "form": "hovuz | ariq | quruq daryo | yomgʻir bogʻi", "position": "past nuqta" },
  "relief": "tekis | tepalik | terassa | amfiteatr",
  "materials": [ "granit plitka", "shagʻal", "yogʻoch" ],
  "palette": { "trees": "keng bargli, siyrak toj", "under": "oʻtloq + koʻp yillik", "color": "kumushrang-yashil" },
  "features": [ "pergola", "koʻprikcha", "amfiteatr" ],
  "mood": "sokin | faol | tantanali"
}
```
- Foydalanuvchi grammatikani **chiplar** koʻrinishida koʻradi va tuzatadi (masalan «Suv: hovuz → yomgʻir bogʻi»). Ishonch < 0,5 boʻlgan maydon sariq.
- Agent oʻsimlik **turini** faqat kutubxonadan tanlaydi (yoddan emas); iqlimga mos kelmasa — almashtirib, sababini yozadi.
- Narx: 1 agent chaqiruvi (koʻruvchi model) — tanga; generatsiya — bepul.

## 3. Uchastkaga moslash — generator (deterministik)
**Ikki usul — rasm turiga qarab:**

### 3A. Grammatika usuli (har qanday referens)
1. **Langarlar:** kirishlar, bekatlar tomoni, past nuqta, mavjud saqlanadigan daraxtlar, eng yaxshi koʻrinish nuqtasi.
2. **Yoʻl tarmogʻi:** kirishlar + dastur markazlari → graf (Delaunay → minimal daraxt + istak chiziqlari); grammatika `loop` boʻlsa — uchastka konturidan ichkariga siljitilgan silliq halqa; `curvature` — silliqlash darajasi (0 — toʻgʻri chiziq va 45°, 1 — egri). Enlar — ierarxiya va normalar boʻyicha (ShNQ 2.07.02-24, 19-band: jamoat hududida ≥ 2,0 m; serqatnov ≥ 2,4 m; velo — 24-jadval).
3. **Zonalar:** grammatika ulushlari × uchastka maydoni; joylash — moslik xaritasi (S = Σ wᵢ·Lᵢ) + `position` qoidasi (suv — past nuqtada, bolalar — kirish yonida va ELU zonasidan tashqarida, sokin — koʻchadan uzoqda); qoʻshnilik: shovqinli ↔ sokin orasida bufer.
4. **Xonalar va kanopi:** `rooms` boʻyicha maysa ochiqliklari; atrofi `canopy.pattern` boʻyicha daraxt guruhlari (Poisson-disk, oraliq ≥ toj); 35-jadval, PUE-7 va trotuar masofalari — qattiq cheklov.
5. **Suv va relyef:** suv obyekti — DEM past nuqtasida, hajmi yomgʻir hisobi bilan (`V = Σ A·ψ·h`, h = 65,2 mm); relyef elementi grammatikada boʻlsa — yer ishlari balansi bilan.
6. **Materiallar va oʻsimliklar:** kutubxonadan, grammatika `materials` va `palette` ga eng yaqin yozuvlar.

### 3B. Reja koʻchirish usuli (referens — yuqoridan koʻrinish: reja yoki aerofoto)
1. Rasm segmentatsiyasi: yoʻl, maysa, daraxt toji, suv, qattiq qoplama (koʻruvchi model + rang klasterlari) → konturlar.
2. **Topologiya grafi:** zonalar va ularning qoʻshniligi, yoʻl skeleti, markaz va oʻqlar.
3. **Konturdan konturga deformatsiya:** referens chegarasi → uchastka chegarasi (oʻxshashlik almashtirish + yupqa plastina spline / mean-value koordinatalari); topologiya saqlanadi, oʻlchamlar real metrga keladi.
4. Tuzatish: yoʻllar kirishlarga ulanadi, enlar normaga, cheklov zonalaridan chiqariladi, mavjud daraxtlar atrofi boʻshatiladi.
5. Natija 3A dagi kabi kutubxona elementlariga aylanadi.

### 3C. Uch variant — sodiqlik darajasi (Render studiyasidagi soʻzlar bilan)
| Variant | Nima saqlanadi | Nima moslashadi |
|---|---|---|
| **Qatʼiy** | 3B topologiyasi va shakllari (reja boʻlsa) yoki grammatika ulushlari ± 5 % | faqat oʻlcham va cheklovlar |
| **Muvozanat** | layout, yoʻl uslubi, zona tarkibi | joylashuv moslik xaritasidan, ulushlar ± 15 % |
| **Erkin** | uslub, materiallar, kayfiyat | kompozitsiya uchastkadan kelib chiqadi |

## 4. Tekshiruv va natija
- Har variantda: normalar reyestri (491 koʻkalamzor ≥ 70 %, 501 sigʻim, 35-jadval, PUE-7, ShNQ 2.07.02-24 nishab va enlar, VMQ 1050), balans, BAF, kanopi 0/10/20 yil, sugʻorish m³/sut, CAPEX oraligʻi.
- **«Referensga oʻxshashlik»** koʻrsatkichi (TALQIN): grammatika maydonlari boʻyicha moslik % (ulushlar, yoʻl egriligi, xonalar soni) — foydalanuvchi qaysi variant referensga yaqinligini koʻradi.
- Har element yonida «Nega?» — qaysi grammatika qoidasi va qaysi cheklov sababli shu yerda.
- Qabul → elementlar muharrirga; tarix; qaytarish mumkin.
- Taqdimot: Bogʻshunos ichidagi render (Master reja modulining 3D kadri) — referens «Uslub» roli bilan.

## 5. Agent qila oladi / qila olmaydi
- **Qila oladi:** rasm turini, layout uslubini, zona ulushlarini, yoʻl xarakterini, materiallar va kayfiyatni taxminan aniqlash; foydalanuvchi matnini grammatikaga qoʻshish; variantlarni tushuntirish.
- **Qila olmaydi / ishonib boʻlmaydi:** rasmdan aniq oʻlcham (masshtab yoʻq); perspektivadan aniq reja; oʻsimlik turini rasmdan aniq aniqlash (faqat «shakl va xarakter» → kutubxonadan tur); yashirin muhandislik.

## 6. Interfeys (kanvas G)
1. **Kirish:** uchastka xaritada + referens rasm(lar)ini tortib tashlash, rol chiplari, matn maydoni.
2. **Grammatika kartasi:** rasm yonida chiplar (ishonch rangi bilan), tahrirlash.
3. **Variantlar:** 3 ta kichik reja (Qatʼiy / Muvozanat / Erkin), har birida 5 koʻrsatkich va oʻxshashlik %; ogohlantirishlar.
4. **Qabul:** «Muharrirga olish» → elementlar; «Render» → taqdimot.

## 7. Test rejasi (Iskandar rasm beradi)
1. Iskandar referens rasm yuboradi (chatga yoki `D:\Work\Claude_Archemistry_Lab\park masterplan`).
2. Uchastka: real joy — Iskandar koʻrsatsa oʻsha; koʻrsatmasa, Toshkentda shu turdagi bogʻga mos hudud tanlanadi (masalan, kanal yoki ariq boʻyidagi boʻsh maydon), chegara Archemistry Lab saytida (OSM fon) chiziladi — ish muhitidan xarita serverlari yopiq, shuning uchun brauzer orqali.
3. Qoʻlda (kod yozilmasdan) usul ishlatiladi: grammatika JSON → 3 variant sxemasi → kanvasda varaq + tekshiruvlar jadvali. Shu test natijasi bilan usul tasdiqlanadi yoki tuzatiladi, keyin kod navbatiga (PR-7) qoʻshiladi.

## 8. Kod navbatiga qoʻshimcha
- **PR-7** «Referensdan dizayn»: `agent/tools-bog.ts` (`read_reference` → grammatika JSON), `bog/fit.ts` (3A generator; v0 yadro qismlari), `bog/warp.ts` (3B deformatsiya), variantlar paneli. PR-3 (muharrir) va PR-5 (daraxt asbobi) dan keyin.

## 9. Test natijasi (14.11, 10:40) — kanvas H
- **Referens:** IMG_1570 — kvartal-bogʻ aksonometriyasi (oʻyin «tomchilari», doira soyabonlar, pergolalar, yogʻoch supalar, koʻp yillik orolchalar, keng perimetr halqa); qoʻshimcha 2 rasm (zinali hovli, 8-shakl yoʻl) — Erkin variantga.
- **Uchastka (real):** OSM way 1453164346, landuse=grass, **0,44 ga (4 409 m²)**, 41,31337 N, 69,25197 E — Tashkent City, Uqchi va Yangi Toshkent koʻchalari orasida; ichida mavjud favvora 281 m²; sharqda 5 qavatli bino 13 m, shimoli-gʻarbda 1 qavatli 10 m. OSM maʼlumoti Iskandarning Chrome brauzeri orqali Overpass API dan olindi.
- **Grammatika** (qoʻlda, agent oʻrniga): aksonometriya, oʻlchamsiz; layout organik; halqa ~4–5 m; koʻk = rezina (suv emas); ulushlar oʻsimlik ~45 / yoʻl ~30 / oʻyin ~18 %.
- **Natija (shapely, aniq maydonlar):**
  | Variant | Oʻxshashlik | Koʻkalamzor | Oʻyin | Halqa | Favvora |
  |---|---|---|---|---|---|
  | Qatʼiy | 98 % | **48,3 % — FAIL (≥ 70)** | 795 m² | 4,5 m | buziladi |
  | **Muvozanat** | 73 % | **70,4 % ✓** | 302 m² | 2,4 m | saqlanadi |
  | Erkin | 60 % | 70,3 % ✓ | 174 m² | 2,4 m | markazda |
- **Xulosalar:** (1) usul ishlaydi — referens masshtabi uchastkaga mos boʻlsa Qatʼiy deyarli 1:1 tushadi; (2) referensni aynan koʻchirish norma bilan zid boʻlishi mumkin — shuning uchun Muvozanat sukut boʻyicha tavsiya; (3) agent «koʻk = suv» deb adashishi mumkin — grammatikada alohida tekshirish maydoni kerak; (4) **ochiq:** hudud maqomi (skver yoki xiyobon; 490-band 0,5 ga), oʻyin maydonchasidan derazagacha masofa normasi, soyabonlar uchun quyosh tahlili, daraxt turlari va oʻsishi (USDA UTD).
- Skriptlar: ish muhitidagi `gen/test_tc.py` (geometriya va koʻrsatkichlar), `gen/board_h.py` (varaq) — PR-7 da `bog/fit.ts` uchun namuna.
