# Archemistry Lab — ekotizim (qoralama, 2026-10-17)

Qaror (Iskandar): xizmatlar alohida ishlaydi, lekin bitta ekotizimda ulanadi. Hozir faqat dizayn va mantiq — sayt/kodga tegilmaydi (master reja boshqa chatda kodda ishlanmoqda).

## Xizmatlar
| Xizmat | Kim uchun | Vazifa |
|---|---|---|
| Master reja (asosiy) | loyihachi, quruvchi | uchastka → koʻcha → hajm → meʼyoriy tekshiruv |
| Koʻchasoz | loyihachi, hokimlik, transportchi | koʻcha tahlili, kesim, YHQ, koʻcha muhiti; masshtab: koʻcha, chorraha, tuman (avtobus, BRT, velo, piyoda). Shahar miqyosi hozircha yoʻq |
| Joyshunos (nom tasdiqlangan) | tadbirkor, developer, master reja | fazoviy tahlil (quyosh, shamol, shovqin, koʻrinish, xizmatlar) + uy narxlari, odamlar oqimi, raqobatchilar; Archi Diagram uslubidagi harakatli diagrammalar |
| Dizayn-kod | hokimlik, arxitektor, tadbirkor | qoidalar markazi: hozir peshlavha; keyin fasad, rang, koʻcha jihozlari, yoritish, koʻkalamzorlashtirish. Master reja binolari va Koʻchasoz koʻchalari shu qoidalar bilan tekshiriladi |
| Chizmadon | hamma | istalgan xizmatdan varaqlar → PDF, DXF, PPTX, PNG |
| Atamalar | hamma, bepul | ochiq lugʻat |

## Ulanish
Bitta hisob, bitta tanga hamyoni, bitta umumiy loyiha fayli. Master rejadan hudud yoki koʻcha bir tugma bilan Joyshunos / Koʻchasozga yuboriladi; natija loyihaga qaytadi yoki Chizmadonga tushadi.

## Obuna siyosati (taklif B, tasdiqlanmagan)
- Obuna bitta asosiy xizmatga.
- Boshqa xizmatni oddiy rejimda koʻrish — bepul.
- Loyihani boshqa xizmatga ulash — 30 tanga, shu loyiha uchun 30 kun (har kirishda emas).
- Biznes maʼlumoti hisoboti (narx, oqim, raqobat) — 40 tanga.
- Ekotizim obunasi (hammasi) — 249 000 soʻm / $25.
- Rad etilgan: A — har kirishda tanga (oʻtishdan qochiradi); C — bitta obuna hammasiga (tadbirkor uchun qimmat).

## Joyshunos maʼlumot manbalari (3 pogʻona)
- Uy narxlari: uybor.uz ochiq API (Mirobod sinovi) → foydalanuvchi bitimlari → agentlik/kadastr hamkorligi.
- Odamlar oqimi: tarmoq markaziyligi + bekatlar + xizmatlar zichligi (taxminiy indeks) → oʻz sanoq ilovasi (qoʻlda 15 daqiqa yoki video) → mobil operator/bank umumlashtirilgan maʼlumoti (shartnoma).
- Raqobatchilar: OSM (toʻliq emas) → foydalanuvchi qoʻshadi va tasdiqlaydi → pullik joylar bazasi.
- Google/Yandex/2GIS maʼlumotini ruxsatsiz yigʻib boʻlmaydi; OLX robots.txt sabab oʻqilmaydi.

Maket: kanvasdagi «Ekotizim» maketi.

## Xizmat ranglari (2026-10-17)
Master reja #141414 · Koʻchasoz #4c5bd4 · Joyshunos #c0643a · Dizayn-kod #0f8a7e (Iskandar tanlovi) · Chizmadon #8b4a9c. Rang faqat belgi (nuqta, faol tab, logotip yoni); uslub hamma xizmatda bir xil (iOS).

## Joyshunos qatlamlari (eski Hudud tahlilidan koʻchadi)
- Yer: relyef (AWS Terrain), nishab, yuza tasnifi (sunʼiy yoʻldosh), issiqlik oroli (Landsat yuza harorati)
- Iqlim: quyosh va soya, shamol (EPW, LBM, Lawson), shovqin
- Shahar: xizmatlar (539-band radiuslari), piyoda yetish
- Biznes: odamlar oqimi, raqobatchilar, uy narxlari
- Asboblar: lineyka, maydon, kesim

## Joyshunos D → Chizmadon → Illustrator (2026-10-17)
- Joyshunos D: yoyilgan aksonometrik qatlamlar (8 qatlam), uslub Chizma / Rangli / Tungi, oraliq sozlanadi.
- «Chizmadonga» bosilganda varaq avtomatik yigʻiladi: andoza (A3 albom, taqdimot, post 4:5), shartli belgilar, shimol va masshtab, shtamp (loyiha, muallif, varaq raqami, sana).
- Illustrator talablari: SVG — har qatlam alohida nomli guruh («01 Relyef» …); matn egri chiziqqa aylantirilmaydi; ranglar namunalar paneliga; shriftlar Archivo va IBM Plex Mono (ochiq litsenziya); kesish maskasi yoʻq. PDF qatlamli, DXF (AutoCAD), PNG 4K.
- Maket: kanvasdagi «Chizmadon · avtomatik varaq va Illustrator eksporti».

## Tungi rejim (2026-10-17, Iskandar qarori — hamma xizmatda)
- Tugma: kun · tun · tizim; sukut — tizim; tanlov hisobga saqlanadi, hamma xizmatga qoʻllanadi.
- Tungi tokenlar (ui.css, [data-theme="dark"]): fon #151517, panel #1e1e21, guruh #26262a, toʻldirish #2e2e33, matn #f2f1ee, ikkinchi matn #a19e97 (6,2:1), tanlangan #6aa8ec, mos #5cbf85, tekshirish #e0a43c, mos emas #ef6b5c (5,5:1). Hammasi panel ustida ≥ 4,5:1.
- Asosiy tugma tunda teskari (oq fon, qora matn). Xizmat ranglari tunda: Koʻchasoz #8a96ff, Joyshunos #e08a5c, Dizayn-kod #3cc2b3, Chizmadon #c286d4.
- Chizmadon varagʻi oq qoladi (bosma); yuklab olingan fayllar mavzuga bogʻliq emas.

## Qurilmalar (2026-10-17, Iskandar qarori)
- Telefon versiyasi yoʻq: ekran kichik, ish uchun yaramaydi. Eng kichik qurilma — planshet (≈ 768 px dan, gorizontal afzal).
- Taklif (tasdiqlanmagan): telefonda faqat koʻrish — Joyshunos pasporti (C), Chizmadon varaqlarini koʻrish va ulashish, «kompyuter yoki planshetda oching» ekrani.
- Kanvasdagi «Mobil» maketi bekor deb belgilandi.
