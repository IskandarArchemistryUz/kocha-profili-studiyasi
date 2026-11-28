# Toshkent daraxtlar reyestri — WFS ulanishi (14.11.2026)

**Qaror (Iskandar, 14.11, 16:18):** reyestr ma'lumoti ochiq ishlatiladi, manba har joyda ko'rsatiladi (Zamin fondi va hamkorlar). Ekologiya — ustuvor: daraxtlarni saqlash tahlil bosqichidanoq boshlanadi. Albomdagi «Daraxtlar xaritasi» varag'i (`albom-boblar-kcap-06-11.md`, 10-varaq) shu ma'lumotga tayanadi. O'sha hujjatdagi «ochiq API yo'q» yozuvi eskirdi — WFS topildi.

## Manba
- Sayt: https://green.tashkent.uz — «Daraxtlar reyestri» loyihasi. Amalga oshiruvchilar: Zamin xalqaro jamoat fondi, Ekologiya vazirligi, Toshkent shahar hokimligi (gov.uz/ru/eco/news/view/89484).
- Interfeysdagi atribut matni: «Manba: Toshkent shahri daraxtlar reyestri — green.tashkent.uz (Zamin fondi, Ekologiya vazirligi, Toshkent shahar hokimligi), {sana}». Har varaqda va eksportda.

## Texnik ma'lumot (14.11 da tekshirildi, Chrome orqali)
- WFS: `https://maps.tashkent.uz/greentashkent/geoserver/greentashkent_db/wfs`
- Qatlam: `greentashkent_db:vw_tree_locations` — nuqtalar, jami **2 217 824** obyekt (14.11). Asl CRS: EPSG:3857.
- Ishlagan so'rov: `service=WFS&version=1.1.0&request=GetFeature&typeName=greentashkent_db:vw_tree_locations&outputFormat=application/json&srsName=EPSG:4326&bbox={minLon},{minLat},{maxLon},{maxLat},EPSG:4326&propertyName=id,dbh_cm,crowndiameter_m,height_m,name_oz,name_ru,is_verified,geom`
- Sinov: Amir Temur xiyoboni atrofi, ≈ 0,7 × 0,7 km → **4 102 daraxt**, javob ~2,5 s.
- `CQL_FILTER` ishlaydi (masalan, `name_oz='Sharq chinori'` → 48 925).
- Maydonlar: `id`, `dbh_cm` (tana diametri), `crowndiameter_m` (toj diametri), `height_m`, `treespecies_id`, `name_uz`/`name_oz`/`name_ru`, `colour`, `is_verified` (dendrolog tekshirgan), `add_date`, `category`, `volunteer_id`, `dendrologist_id`.
- **Shaxsga oid maydonlar olinmaydi:** `volunteer_id`, `dendrologist_id` — `propertyName` bilan chiqarib tashlanadi, saqlanmaydi.
- Boshqa qatlamlar (sayt kodidan): WMS `greentashkent:green_zones_trees`, `greentashkent:Parklar_umumiy_maydon`, `greentashkent:lulc2016_2023`, `greentashkent_db:vw_mahalla_count`, mahallalar chegaralari; tur statistikasi — Visiology dashboard (`bi-dev.tashkent.uz`).
- CORS: brauzerdan to'g'ridan-to'g'ri chaqirishga tayanmaslik — Lab serverida proksi + kesh (uchastka bbox kaliti bilan, 24 soat). So'rovlar sekin va kam: bitta uchastka — bitta so'rov; katta hudud — bbox bo'laklari.

## Lab da ishlatish
1. **Joyshunos / Master reja 1-qadam (mavjud holat va cheklovlar):** «Reyestrdan daraxtlarni yuklash» — uchastka bbox → nuqtalar → poligon bo'yicha kesish. Har daraxt: tur, balandlik, tana va toj diametri, tekshirilganmi.
2. **Saqlash tahlili (R14, ShNQ 2.07.01-23, 480-band):** qurilish dog'i, yo'l va tarmoqlar bilan kesishgan daraxtlar → «saqlanadi / ko'chiriladi / kesiladi» ro'yxati; toj proyeksiyasi va ildiz zonasi bufer (toj radiusi) bilan.
3. **Ko'rsatkichlar:** daraxtlar soni va zichligi, toj qoplami %, tur tarkibi va R22 (tur ≤ 5 %, turkum ≤ 10 %, oila ≤ 20 %), mahalliy turlar ulushi (assortiment CSV bilan bog'lanadi).
4. **Varaqlar:** «Daraxtlar xaritasi» (albom 10-varaq) va «Daraxtlar reyestri / inventarizatsiya vedomosti» — №, tur, D, H, toj, holat (tekshirilgan), qaror (saqlash/ko'chirish/kesish), manba qatori.
5. **Bog'shunos:** mavjud daraxtlar — langar (yo'l tarmog'i R8, R14), yangi ekish tur tanlovida mahalla bo'yicha ulushlar hisobga olinadi.

## Ochiq
- Kesish va ko'chirish uchun rasmiy tartib (moratoriy, kompensatsion ekish) — normalar bilan alohida.
- Reyestr to'liqligi: tumanlar bo'yicha dendrolog tekshiruvi 58–100 % (statistika sahifasi, 14.11).
