# Koʻcha Profili Studiyasi

Koʻchalarni tahlil qilish va qayta loyihalash uchun brauzer asbobi — Toshkent va Oʻzbekiston sharoitiga moslangan. Archemistry Urban loyihasi.

**Ochish:** https://iskandararchemistryuz.github.io/kocha-profili-studiyasi/ (GitHub Pages) yoki `index.html` faylini brauzerda oching. Oʻrnatish shart emas; internet kerak (xarita, sunʼiy yoʻldosh tasviri, OpenStreetMap).

## Nima qila oladi

**Hudud tahlili** — xaritada hudud belgilanadi; sunʼiy yoʻldosh tasviri (Esri World Imagery) piksellari OpenStreetMap qatlamlari bilan birlashtirilib, hudud funksiyalar boʻyicha foizda ajratiladi: qatnov qismi, trotuar, oʻsimlik, binolar, suv va boshqalar.

**Koʻcha profili** — koʻchani bosganda mavjud koʻndalang kesim avtomatik aniqlanadi (koʻcha boʻylab har 1 m dagi kesimlarning koʻpchilik qiymati). Qatnov qismi sunʼiy yoʻldosh tasviridagi asfalt rangidan aniqlanadi; profil OSM oʻqidan siljishi hisobga olinadi. Chetlar va oʻq xaritada sudrab tuzatiladi. Kutubxonada 34 element (parkovka 0°/30°/45°/90°, yuk/taksi zonasi, BRT, burilish boʻlagi, orolcha, parklet, kiosk, kanal va boshq.). Loyiha profili mavjud holat bilan taqqoslanadi: kenglik ulushlari, oʻtkazuvchanlik, kesib oʻtish masofasi, daraxtlar, parkovka joylari.

**Loyiha chizish (YHQ)** — koʻchalar xaritada modullardan chiziladi va tugunlarda ulanadi:
- 49 ta koʻcha moduli va parametrik Konstruktor (boʻlaklar, ajratuvchi, BRT, tramvay, velo, parkovka 0°/30°/45°/90°, dublyor, yomgʻir bogʻlari);
- radiusli burilishlar, bordyur radiusi bilan chorrahalar, 7 turdagi aylanma halqa (turbo-halqa ham);
- piyoda oʻtish joylari, bekatlar, parklet, veloparkovka, erkin shakllar va yoʻl chiziqlari;
- yoʻl belgilari katalogi va avtomatik joylashtirish;
- YHQ mantigʻi boʻyicha tekshiruvlar (band raqamlarini foydalanuvchi kiritadi);
- nusxa/qoʻyish/koʻchirish, orqaga/oldinga (Ctrl+Z/Y), oʻng tugma menyusi;
- eksport: PNG, SVG, DXF (mahalliy yoki UTM 42N), GeoJSON, CSV hisob-kitob, 3D koʻrinish va OBJ+MTL.

**Konseptual 3D** — profil yoki loyiha koʻchasi izometrik taqdimot koʻrinishida: bino, daraxtlar, odamlar, transport, yoʻl belgilari, oʻlchamlar; PNG eksport.

**3D shahar** — MapLibre GL + OpenFreeMap: OSM binolari hajmda, sunʼiy yoʻldosh va loyiha qatlami.

**Xaritalar** — Esri sunʼiy yoʻldosh, OSM nomlar va maʼmuriy chegaralar (Overpass), OpenStreetMap, CARTO Voyager, Google sunʼiy yoʻldosh (foydalanuvchining Map Tiles API kaliti bilan).

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
