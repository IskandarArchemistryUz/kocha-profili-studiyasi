# Archemistry Lab — interfeysni toʻliq qayta dizayn (2026-10-15)

Kanvas: https://claude.ai/artifact/2p82Mowpt3JrTEppHiT3ii («Archemistry Lab — toʻliq maket (iOS uslubi)»)
Asos: repo iskandararchemistryuz/kocha-profili-studiyasi (18 HTML sahifa + app/ + mr/), PR #68 holati.

## Tuzilma: 18 sahifa → 7 ish joyi + 2 asbob
- Bosh sahifa va loyihalar ← index.html, app/ #/ roʻyxat, loyiha.html (menyu, zaxira)
- Master reja (12 qadam, bitta 3D oyna) ← app/ + muharrir.html + posadka.html + masterreja.html + loyiha.html qobigʻi
- Koʻcha studiyasi ← kocha.html + studio.html (profil va «Loyiha chizish»)
- Bino studiyasi ← bino.html + posadka qavat rejasi + massing
- Tahlil (8 qatlam) ← ai.html + gis.html + shamol.html + studio «Hudud tahlili»
- Albom ← maket.html; barcha «Albomga» shu yerga
- Maʼlumotlar ← data.html
- Alohida: Dizayn-kod (dizaynkod + dizaynkod-joy), Atamalar

## Topilgan takrorlar
Albomga 7 joyda · koʻcha kesimi muharriri 3 · 3D koʻruvchi 5 · shamol guli 3 · fon xarita tanlovi 3 · AI render 2 · loyiha parametrlari 3 · toast 6.
Rang driftlari: qizil 4 xil (#b23a2e/#b3261e/#c0392b/#c2432b), sariq 3, koʻk 4, xira matn 3. Atamalar.html alohida tizimda (koʻk, Unbounded, ASCII ').

## Yangi tizim (ui.css)
Archivo + IBM Plex Mono (faqat kod/koordinata). Radius 9/12/16/22. Asosiy tugma — qora; sariq faqat fon; koʻk — tanlov.
Holat: ok #2b7449, warn #95620f, bad #b23a2e, na #6b6965 (kontrast tekshirilgan, 4,5:1+).
Harakat: bosish 95 % · prujina 340 ms · sheet 420 ms · yopish 280 ms · reduced-motion.

## Ochiq savollar
- Dizayn tizimi artifaktini (radius, soya, ok rangi) yangilash kerakmi
- Maket raqamlari namuna; dizayn-kod harf balandligi chegarasi maketda shartli
