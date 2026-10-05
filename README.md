# Koʻcha Profili Studiyasi

Koʻchalarni tahlil qilish va qayta loyihalash uchun brauzer asbobi — Toshkent va Oʻzbekiston sharoitiga moslangan. Archemistry Urban loyihasi.

**Ochish:** https://iskandararchemistryuz.github.io/kocha-profili-studiyasi/ (GitHub Pages) yoki `index.html` faylini brauzerda oching. Oʻrnatish shart emas; internet kerak (xarita, sunʼiy yoʻldosh tasviri, OpenStreetMap).

## Nima qila oladi

**Hudud tahlili** — xaritada hudud belgilanadi; sunʼiy yoʻldosh tasviri (Esri World Imagery) piksellari OpenStreetMap qatlamlari bilan birlashtirilib, hudud funksiyalar boʻyicha foizda ajratiladi: qatnov qismi, trotuar, oʻsimlik, binolar, suv va boshqalar.

**Koʻcha profili** — koʻchani bosganda mavjud koʻndalang kesim avtomatik aniqlanadi (koʻcha boʻylab har 1 m dagi kesimlarning koʻpchilik qiymati). Qatnov qismi sunʼiy yoʻldosh tasviridagi asfalt rangidan aniqlanadi; profil OSM oʻqidan siljishi hisobga olinadi. Chetlar va oʻq xaritada sudrab tuzatiladi. Kutubxonada 34 element (parkovka 0°/30°/45°/90°, yuk/taksi zonasi, BRT, burilish boʻlagi, orolcha, parklet, kiosk, kanal va boshq.). Loyiha profili mavjud holat bilan taqqoslanadi: kenglik ulushlari, oʻtkazuvchanlik, kesib oʻtish masofasi, daraxtlar, parkovka joylari.

**Loyiha chizish (YHQ)** — koʻchalar xaritada modullardan chiziladi va tugunlarda ulanadi:
- 49 ta koʻcha moduli va parametrik Konstruktor (boʻlaklar, ajratuvchi, BRT, tramvay, velo, parkovka 0°/30°/45°/90°, dublyor, yomgʻir bogʻlari);
- radiusli burilishlar, bordyur radiusi bilan chorrahalar, 7 turdagi aylanma halqa (turbo-halqa ham);
- koʻcha oʻqdan boshqariladi: oʻq — qatnov qismining markazi, tugunlar shu oʻqda; chetni sudraganda ikki tomon simmetrik oʻzgaradi (Alt — bir tomon);
- eni har xil koʻchalar ulanganda silliq oʻtish (taper) va uzluksiz oʻq chizigʻi;
- chorrahaga yaqinlashishda qoʻshimcha boʻlaklar (chapga, oʻngga, qayrilish; 1–2 tadan), toʻplanish va oʻtish (taper) uzunligi — avtomatik (vaziyatga qarab) yoki qoʻlda; uzunliklar namuna qiymat, normativ bilan tasdiqlanadi;
- chorrahaga yaqinlashishda har bir boʻlakka 1.18 strelkalari (toʻgʻri, chap, oʻng, birikmalar, qayrilish) — avtomatik, bosib yoki panelda almashtiriladi;
- piyoda oʻtish joylari, bekatlar, parklet, veloparkovka, erkin shakllar va yoʻl chiziqlari;
- yoʻl belgilari katalogi va avtomatik joylashtirish;
- YHQ mantigʻi boʻyicha tekshiruvlar (band raqamlarini foydalanuvchi kiritadi);
- nusxa/qoʻyish/koʻchirish, orqaga/oldinga (Ctrl+Z/Y), oʻng tugma menyusi;
- eksport: PNG, SVG, DXF (mahalliy yoki UTM 42N), GeoJSON, CSV hisob-kitob, 3D koʻrinish va OBJ+MTL.

**Konseptual 3D** — profil yoki loyiha koʻchasi izometrik taqdimot koʻrinishida: bino, daraxtlar, odamlar, transport, yoʻl belgilari, oʻlchamlar; PNG eksport.

**3D shahar** — MapLibre GL + OpenFreeMap: OSM binolari hajmda, sunʼiy yoʻldosh va loyiha qatlami.

**Xaritalar** — Esri sunʼiy yoʻldosh, OSM nomlar va maʼmuriy chegaralar (Overpass), OpenStreetMap, CARTO Voyager, Google sunʼiy yoʻldosh (foydalanuvchining Map Tiles API kaliti bilan).

**AI · hudud bahosi** (`ai.html`) — hudud doira, toʻrtburchak yoki erkin chegara bilan tanlanadi; «Faqat hudud ichi» — tashqarisi xaritada, albomda va 3D da kesiladi. Qatlamlar: piyoda tarmogʻi, bekatlar, 15 daqiqa xizmatlari, binolar, yashil/suv, temir yoʻl, metro, tramvay, aeroport, yer foydalanish. Shovqin proksi — magistral yoʻllar, temir yoʻl/tramvay va aeroport (uchish-qoʻnish yoʻlagi va parvoz koridori) boʻyicha masofa; oʻlchov emas.
**3D / vektor** — hudud 3D modeli: koʻrinish (NW/NE/SW/SE izometriya, yuqoridan, koʻz sathi, perspektiva, soyalar), grafika (konturiz, ingichka kontur, oq-qora), qatlamlar va ranglar, ikonkalar ustunda; yuklab olish: SVG (vektor illyustratsiya), PNG, OBJ+MTL, DXF (3DFACE + rejadagi chiziqlar), STL (1:1000–1:10 000, mm), GLB, DAE (SketchUp); albomga yuborish.

**Dizayn-kod · peshlavha** (`dizaynkod.html`) — Toshkent dizayn-kodi (Kengash qarori 2026-yil 17-fevral, VII-19-17-14-0-K/26, 2-ilova, P2.3 §2) boʻyicha peshlavhani fasad rasmida tekshirish. 4 qadam: rasm → eshik (tekislash va masshtab eshik oʻlchami boʻyicha) → fasad chegaralari va qavatlar → viveska. Har bir talab boʻlim, bet va soʻzma-soʻz iqtibos bilan; xato boʻlsa «Tuzatish» tugmasi. Yaqinlashtirish, chizgʻichlar, oʻlcham chiziqlari, magnit, kunduzgi/kechki yoritish koʻrinishi. Qoidalar sahifa ichida JSON koʻrinishida (205 qoida); hujjatdagi noaniqliklar boʻyicha loyiha talqinlari (Q-01…Q-13) — rasmiy tushuntirish emas.

## Tuzilishi

```
index.html     sahifa
css/app.css    uslublar
js/app.js      butun mantiq
```

Tashqi kutubxonalar CDN orqali yuklanadi: Leaflet 1.9.4, three.js r128 (3D rejimlarda), MapLibre GL 4.7 (3D shahar).

## Maʼlumot manbalari va cheklovlar

- Sunʼiy yoʻldosh tasviri: Esri World Imagery (olingan sanasi nomaʼlum). Xarita va obyektlar: © OpenStreetMap hissadorlari (Overpass API). Manzil qidiruvi: Photon / Nominatim.
- Piksel tasnifi rang indeksiga (ExG) va OSM geometriyasiga tayanadi; trotuar koʻpincha taxmin. Natijani joyida tekshiring.
- Yoʻl chiziqlari va belgilar raqamlanishi Vena konvensiyasi asosidagi tizim boʻyicha; YHQ ilovalari bilan solishtirib tasdiqlash kerak. Modul kengliklari va tekshiruv chegaralari namuna qiymat, normativ emas.
- Oʻtkazuvchanlik diapazonlari — NACTO, *Transit Street Design Guide* (2016), indikativ.
- 3D rejim vizualizatsiya: sirtlar tekis qatlamlar, muhandislik modeli emas.
