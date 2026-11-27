# Yershunos · ustuvorlik reytingi, 2-tahrir (26.11.2026)

Qaror (Iskandar, 26.11): reyting "xavf × ta'sir × zaiflik" tuzilmasiga o'tkazilsin; o'sishga katta vazn saqlanadi.

## Formula
`R = bosim^0,5 × xavf^0,25 × zaiflik^0,25` (0–100; har bir omil kamida 1).

- **Bosim** (`p.ro`): aholining yillik o'sish sur'ati, 197 birlik ichidagi o'rni (foiz-rang). Chegarasi o'zgargan birliklarda o'z barqaror davri (`oz.y`).
- **Xavf** (`p.rx`): uch foiz-rangning o'rtachasi — issiq kunlar (Tmax > 35 °C, `rh`), qurg'oqchillik (SPEI-12 teskari, `rq`), suv stressi (`rw`; 1995–2014 ssenariysida Aqueduct bazaviy `bws`, 2050 ssenariylarida `ws50`).
- **Zaiflik** (`p.rz`): SIAT bo'yicha indeks `j.z` (yo'q bo'lsa 50).

Oldingi formula: `(2·o'sish + issiq + qurg'oqchillik) / 4` (yig'indi). Farqi: ko'paytma — yuqori ball uchala omil ham yuqori bo'lishini talab qiladi.

Kod: `index.html`, `uzClim()` ichida; kartadagi ustunlar: bosim, xavf, zaiflik. Artefakt versiyasi `1795710003-4204`.

## Natija (2040–2059, SSP2-4.5)
Ball (bosim · xavf · zaiflik):
1. Buxoro tumani 83 (96 · 79 · 64)
2. Bandixon 81 (99 · 57 · 79)
3. Qarshi tumani 79 (98 · 51 · 81)
4. Ko'kdala + Chiroqchi 78 (95 · 48 · 83)
5. Angor 78 (85 · 62 · 82)
6. Muzrabot 78 (89 · 62 · 74)
7. Andijon tumani 77 (96 · 53 · 74)
8. Sho'rchi 77 (87 · 62 · 74)
9. Qiziriq 77 (87 · 60 · 76)
10. Koson 75 (79 · 69 · 76)
11. Mirishkor 75 · 12. Sherobod 75 · 13. Kasbi 74 · 14. Oltinsoy 74 · 15. Nishon 72

- 70+ ball: 21 birlik, 4,62 mln kishi.
- Birinchi 30 talik: Surxondaryo 10, Qashqadaryo 7, Andijon 4, Samarqand 3, Sirdaryo 2, Buxoro, Jizzax, Farg'ona, Namangan 1 tadan.
- Eski o'ntalikdan tushganlar: Qorovulbozor (6 → 78-o'rin) va Mingbuloq (10 → 45-o'rin) — o'sish va iqlim yuqori, lekin zaiflik past.
- Baxmal: 61 ball, 52-o'rin (bosim 81, xavf 29, zaiflik 70). Reytingda toshqin yo'q, shuning uchun Baxmalning asosiy xavfi bu ballda aks etmagan.

## Cheklovlar
- Toshqin va seysmik xavf kirmagan (respublika miqyosidagi qatlam yo'q).
- Suv stressi kanal suvini ko'rmaydigan global modeldan; xavf ichida 1/3, umumiy ballda taxminan 8 % vazn.
- Zaiflik indeksi vaznlari ekspert qarori emas (qarang: `yershunos-uzbekiston-zaiflik-26-11.md`).
- Foiz-rang nisbiy: ball "respublika ichida boshqalarga nisbatan"ni bildiradi, mutlaq xavf darajasini emas.
