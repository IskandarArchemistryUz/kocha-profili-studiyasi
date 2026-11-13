# Kadastr agregati — 50 m katak (Joyshunos «Uylar va aholi»)

Manba: Toshkent shahar GIS (kadastr), 2023-iyun holati, tozalangan nusxa. Egasi qarori (13.11.2026): hamma uchun — faqat 50 m katakka umumlashtirilgan qiymatlar; bino darajasidagi maʼlumot repoga tushmaydi (egasining shaxsiy qatlami — serverda, faqat oʻz hisobida).

`data/kadastr/toshkent_50m.bin.gz` — gzip, ichida uint16 LE, 4 tekislik (har biri ny × nx, qator 0 — shimol):
1. aholi — kishi (koʻp kvartirali uy xonadonlari × 3,54 + har yakka uy uchastkasi × 3,54; taxmin)
2. kku — koʻp kvartirali uylar soni (markazi katakda)
3. yil — koʻp kvartirali uylar qurilgan yili medianasi (0 — yoʻq)
4. yuqori bayt — seysmik eʼtibor toifasi (4 — 1966 gacha; 3 — 1966–1991 gʻisht/yogʻoch; 2 — 1966–1991 beton/panel; 1 — 1992 dan keyin; 0 — nomaʼlum), katakdagi eng yuqorisi; pastki bayt — eng baland qavat

Toʻr: `toshkent_index.json` (bbox, qadam 0,0006° × 0,00045° ≈ 50 × 50 m, nx 600, ny 578). Seysmik toifa — saralash (qaysi uyni birinchi tekshirish kerak), ekspertiza emas.
