# Koʻcha Profili Studiyasi

Koʻchalarni tahlil qilish va qayta loyihalash uchun brauzer asbobi — Toshkent va Oʻzbekiston sharoitiga moslangan. Archemistry Urban loyihasi.

**Ochish:** `index.html` faylini brauzerda oching yoki GitHub Pages havolasidan foydalaning. Oʻrnatish shart emas; internet kerak (xarita, sunʼiy yoʻldosh tasviri, OpenStreetMap).

## Nima qila oladi

**Hudud tahlili** — xaritada hudud belgilanadi; sunʼiy yoʻldosh tasviri (Esri World Imagery) piksellari OpenStreetMap qatlamlari bilan birlashtirilib, hudud funksiyalar boʻyicha foizda ajratiladi: qatnov qismi, trotuar, oʻsimlik, binolar, suv va boshqalar.

**Koʻcha profili** — koʻchani bosganda mavjud koʻndalang kesim avtomatik aniqlanadi (koʻcha boʻylab har 1 m dagi kesimlarning koʻpchilik qiymati). Loyiha profili tuziladi va mavjud holat bilan taqqoslanadi: kenglik ulushlari, oʻtkazuvchanlik, kesib oʻtish masofasi, daraxtlar, parkovka.

**Loyiha chizish (YHQ)** — koʻchalar xaritada modullardan chiziladi va tugunlarda ulanadi:
- 51 ta koʻcha moduli va parametrik Konstruktor (boʻlaklar, ajratuvchi, BRT, tramvay, velo, parkovka 0°/30°/45°/90°, dublyor, yomgʻir bogʻlari);
- radiusli burilishlar, bordyur radiusi bilan chorrahalar, 7 turdagi aylanma halqa (turbo-halqa ham);
- piyoda oʻtish joylari, bekatlar, parklet, veloparkovka, erkin shakllar va yoʻl chiziqlari;
- yoʻl belgilari katalogi va avtomatik joylashtirish;
- YHQ mantigʻi boʻyicha tekshiruvlar (band raqamlarini foydalanuvchi kiritadi);
- nusxa/qoʻyish/koʻchirish, orqaga/oldinga (Ctrl+Z/Y), oʻng tugma menyusi;
- eksport: PNG, SVG, DXF (mahalliy yoki UTM 42N), GeoJSON, CSV hisob-kitob, 3D koʻrinish va OBJ+MTL.

## Tuzilishi

```
index.html     sahifa
css/app.css    uslublar
js/app.js      butun mantiq
```

Tashqi kutubxonalar CDN orqali yuklanadi: Leaflet 1.9.4, three.js r128 (faqat 3D rejimda).

## Maʼlumot manbalari va cheklovlar

- Sunʼiy yoʻldosh tasviri: Esri World Imagery (olingan sanasi nomaʼlum). Xarita va obyektlar: © OpenStreetMap hissadorlari (Overpass API). Manzil qidiruvi: Photon / Nominatim.
- Piksel tasnifi rang indeksiga (ExG) va OSM geometriyasiga tayanadi; trotuar koʻpincha taxmin. Natijani joyida tekshiring.
- Yoʻl chiziqlari va belgilar raqamlanishi Vena konvensiyasi asosidagi tizim boʻyicha; YHQ ilovalari bilan solishtirib tasdiqlash kerak. Modul kengliklari va tekshiruv chegaralari namuna qiymat, normativ emas.
- Oʻtkazuvchanlik diapazonlari — NACTO, *Transit Street Design Guide* (2016), indikativ.
- 3D rejim vizualizatsiya: sirtlar tekis qatlamlar, muhandislik modeli emas.
