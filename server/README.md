# Archemistry Lab — server

Hisob (pochta yoki telefon, bir martalik kod), tanga hamyoni, toza eksport ruxsatnomasi va haftalik sinovlar.
Sayt GitHub Pages'da qoladi (`archemistry.uz`), API — `api.archemistry.uz` (Oʻzbekistondagi VPS: shaxsiy maʼlumotlar
Oʻzbekiston hududida saqlanishi kerak).

## API

| Yoʻl | Nima qiladi |
|---|---|
| `GET /health` | tekshiruv |
| `GET /prices` | narx jadvali, toʻplamlar, sinovlar |
| `POST /quote` `{items, areaHa}` | narxni hisoblash (yechmasdan) |
| `POST /auth/code` `{target, lang}` | pochtaga 6 xonali kod (`lang`: uz/en/ru); SMS hali ulanmagan |
| `POST /auth/verify` `{target, code}` | kirish → `ks_sess` cookie (HttpOnly, 60 kun) |
| `GET /auth/config` | yoqilgan kirish usullari (Google mijoz identifikatori) |
| `POST /auth/google` `{credential}` | Google ID token → sessiya; shu pochtadagi hisobga ulanadi |
| `POST /auth/logout` | chiqish |
| `GET /me` | balans, shu haftadagi bepul sinovlar |
| `GET /me/history` | tanga daftari |
| `POST /export/ticket` `{items, areaHa, stateHash}` | tanga yechiladi → 15 daqiqalik imzolangan ruxsatnoma; shu holatni qayta yuklash bepul |
| `POST /export/verify` `{ticket}` | ruxsatnomani tekshirish |
| `POST /trial` `{kind: area\|flats\|wind}` | haftasiga 3 tasi bepul, keyin 1 / 2 / 2 tanga |

Xatolar: `401` — kirilmagan, `402` — tanga yetmaydi (`need`, `balance`), `429` — juda koʻp soʻrov.

## Qoidalar

- Narx faqat serverda hisoblanadi (`src/prices.js`), brauzer yuborgan narxga ishonilmaydi.
- Balans — `ledger` yigʻindisi; yozuvlar oʻchirilmaydi. Yechish foydalanuvchi qatorini qulflab bajariladi.
- `(user, reason, ref)` noyob: bir toʻlov xabari ikki marta kelsa, tanga bir marta qoʻshiladi.
- Kirish kodi va sessiya tokeni bazada faqat SHA-256 xesh koʻrinishida.

## Ishlab chiqish

```bash
cd server && npm ci && npm test          # PGlite (xotiradagi Postgres)
TEST_DATABASE_URL=postgres://… npm test  # haqiqiy PostgreSQL (CI shunday qiladi)
```

## Keyingi bosqichlar

- S2: Click va Payme toʻlovlari (merchant shartnomasidan keyin, avval sinov rejimi).
- S3: ✓ pochta (SMTP) va Google bilan kirish; ilovada «Kirish» oynasi. SMS — keyinroq.
- S4: VPS — `deploy/README.md` yoʻriqnomasi.
