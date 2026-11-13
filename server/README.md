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
| `GET /agent/config` | agent «Maslahatchi»: yoqilganmi, xizmatlar, ssenariylar narxi, bepul qoldiq |
| `POST /agent/run` `{scenario, project?, areaHa?}` | yurish boshlash: haftalik bepul savol yoki tanga oldindan yechiladi → `run` |
| `POST /agent/step` `{run, messages, lang}` | bitta model qadami (tizim yoʻriqnomasi va buyruqlar serverda qoʻshiladi) |
| `GET /render/config` | render yoqilganmi, dvigatellar narxi, parallel chegara |
| `POST /render/upload-url` `{type, bytes}` | R2 presigned PUT (5 daq), faqat `image/webp` \| `image/png`, ≤ 8 MB → `{key, url, headers}` |
| `POST /render/jobs` `{engine, input:{key,w,h}, refs?, subj, style, fid, extra?, facts?, source, project?}` | tanga ushlanadi (hold), prompt serverda yigʻiladi, fal queue → `{id, status, coins, balance, downgraded}` |
| `POST /render/hook` | fal webhook (ED25519 imzo): natija R2 ga, 512 px WebP eskiz, CAPTURE; xatoda RELEASE |
| `GET /render/jobs/:id` · `GET /render/history` | holat, natija va eskiz havolalari (1 soatlik GET) |

**Agent** (`src/agent.js`, `src/agent-tools.js`): kalit `ANTHROPIC_API_KEY` faqat serverdagi `.env` da; boʻlmasa oʻchiq.
Qisqa savol 1 tanga, xulosa 3 tanga (k yoʻq, loyiha shiftiga kiradi); haftasiga 3 ta qisqa savol bepul. Chegaralar: yurishda
≤ 10 qadam va ≤ 200 ming kirish tokeni, 30 daqiqa; bepul savollarga kunlik $2, hammasiga kunlik $20 (`AGENT_*`).
Birinchi qadam model xatosi bilan tugasa — tanga va bepul savol qaytariladi. Savol matni bazaga yozilmaydi — faqat token, $, tanga.

**Render** (`src/render/`): kalitlar `FAL_KEY`, `R2_*` faqat `.env` da; boʻlmasa `/render/*` → 503 «Render vaqtincha ishlamayapti».
Tez 1 · Pro 2K 2 · Pro 4K 4 tanga (`RENDER_COINS`), loyiha shiftiga kirmaydi. Tanga natija kelguncha ushlanadi (`holds`),
xatoda qaytadi. Parallel: foydalanuvchi 2, hali toʻlamagan 1, sayt 20. Kunlik fal chegarasi `RENDER_DAILY_USD_CAP` ($20):
80 % da egasiga xabar, chegarada Pro → Tez, keyin rad. Webhook kelmasa — har 5 daqiqada fal dan soʻraladi, 30 daqiqadan keyin
tanga qaytadi. Egasi — tangasiz. Rasm VPS diskida saqlanmaydi.

Xatolar: `401` — kirilmagan, `402` — tanga yetmaydi (`need`, `balance`), `429` — juda koʻp soʻrov.

### Loyihalar bulutda (`src/projects.js`)

Hujjat serverdan oʻtmaydi (nginx ≤ 128 KB): brauzer uni gzip qilib R2 ga presigned PUT bilan yuklaydi.

| Soʻrov | Vazifasi |
|---|---|
| `GET /projects?type=master` · `?trash=1` | roʻyxat + `usage` (bytes, quota, count, max) |
| `GET /projects/:id` · `?version=N` | tavsif + R2 dan yuklash havolasi (10 daqiqa) |
| `GET /projects/:id/versions` | oxirgi 5 nusxa |
| `POST /projects/:id/upload` `{type, bytes, base_version}` | presigned PUT (`application/gzip`, 5 daqiqa) |
| `POST /projects/:id/commit` `{key, base_version, name, type, meta}` | tekshiradi va versiyani +1 qiladi |
| `PATCH /projects/:id` `{name?, meta?}` | nom / meta (versiya oʻzgarmaydi) |
| `DELETE /projects/:id` · `POST /projects/:id/restore` | savatga (30 kun) / tiklash |

`base_version` mos kelmasa — `409 conflict` (boshqa qurilmada oʻzgargan; ustidan yozilmaydi).
Chegaralar: bitta loyiha ≤ 30 MB (siqilgan), hisob ≤ `PROJECTS_QUOTA_MB` (500), ≤ 300 loyiha; egasiga chegara yoʻq.
Turlar: master, kochasoz, joyshunos, chizmadon, render, dizaynkod, binokor, bogshunos.

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
