# api.archemistry.uz — serverni ishga tushirish (bir martalik)

Sayt GitHub Pages'da qoladi (`archemistry.uz`). Bu yoʻriqnoma — hisob, kirish va tanga hamyoni ishlaydigan
API uchun (`api.archemistry.uz`). Shaxsiy maʼlumotlar (pochta, toʻlovlar) Oʻzbekistondagi serverda saqlanadi.

Parol, maxfiy kalit va SMTP parolini hech qachon chatga yoki repoga yozmang — faqat serverdagi `.env` faylga
yoki GitHub → Settings → Secrets ga.

## 1. Server (Airnet VPS)

- Tarif: Strong (2 vCPU, 4 GB) yetadi. Tizim: **Ubuntu 24.04**.
- Airnet bergan IP manzilni yozib oling.

## 2. DNS (ahost.uz paneli)

`archemistry.uz` zonasiga bitta yozuv qoʻshing:

| Turi | Nomi | Qiymati |
|---|---|---|
| A | `api` | VPS IP manzili |

Tekshirish (bir necha daqiqadan keyin): `nslookup api.archemistry.uz` — VPS IP chiqishi kerak.

## 3. Serverni sozlash (bitta buyruq)

Kompyuteringizdan serverga kiring (Airnet bergan login — odatda `ubuntu` — va parol bilan), keyin darhol `passwd` bilan parolni almashtiring:

```bash
ssh ubuntu@VPS_IP
passwd
```

Keyin:

```bash
curl -fsSL https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi/main/server/deploy/setup.sh | sudo bash
```

Skript: tizimni yangilaydi, xavfsizlik devorini (faqat SSH, HTTP, HTTPS) va fail2ban ni yoqadi, Node 22, PostgreSQL,
Nginx oʻrnatadi, bazani tasodifiy parol bilan yaratadi, `.env` ni maxfiy kalitlar bilan toʻldiradi, xizmatni ishga
tushiradi, HTTPS sertifikatini oladi va kunlik zaxira nusxani (03:30, 14 kun) yoqadi. Oxirida
`{"ok":true}` chiqsa — tayyor. Brauzerda: https://api.archemistry.uz/health

Shu bosqichda kirish kodi pochtaga yuborilmaydi, faqat server jurnaliga yoziladi (`OTP_SENDER=log`) — sinov uchun.

## 4. Pochta (kirish kodi uchun)

Kod `kod@archemistry.uz` kabi manzildan yuboriladi. Buning uchun domen pochtasi kerak — bittasini tanlang:

- **Yandex 360** yoki **Zoho Mail** — domen pochtasi (xodimlar uchun ham ishlatiladi), SMTP orqali yuboradi.
- **Resend** yoki shunga oʻxshash xat yuborish xizmati — faqat avtomatik xatlar uchun.

Tanlangan xizmat koʻrsatgan **SPF** va **DKIM** yozuvlarini ahost.uz DNS ga qoʻshing (aks holda xatlar «Spam» ga tushadi).
Keyin serverda:

```bash
nano /srv/archemistry/server/.env
#   OTP_SENDER=smtp
#   SMTP_URL=smtps://LOGIN:PAROL@smtp.provayder:465
#   MAIL_FROM=Archemistry Lab <kod@archemistry.uz>
systemctl restart archemistry-api
```

## 5. Google bilan kirish

1. https://console.cloud.google.com → yangi loyiha «Archemistry Lab».
2. **APIs & Services → OAuth consent screen**: External, ilova nomi «Archemistry Lab», qoʻllab-quvvatlash pochtasi,
   maxfiylik siyosati havolasi (sahifa tayyorlanadi).
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   «Authorized JavaScript origins»: `https://archemistry.uz` va `https://www.archemistry.uz`.
4. Hosil boʻlgan **Client ID** (`….apps.googleusercontent.com`) — maxfiy emas. Serverda `.env` ga
   `GOOGLE_CLIENT_ID=…` yozing va `systemctl restart archemistry-api`.

## 6. Avtomatik yangilash (GitHub → server)

Serverda, `archemistry` foydalanuvchisi uchun alohida kalit:

```bash
sudo -u archemistry bash -c 'mkdir -p ~/.ssh && ssh-keygen -t ed25519 -f ~/.ssh/deploy -N "" -C github-deploy \
  && cat ~/.ssh/deploy.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && cat ~/.ssh/deploy'
```

Chiqqan maxfiy kalitni (`-----BEGIN OPENSSH PRIVATE KEY-----` … `END …`) GitHub → repo → **Settings → Secrets and
variables → Actions** ga qoʻying:

- `VPS_SSH_KEY` — shu kalit matni;
- `VPS_HOST` — VPS IP manzili.

Keyin serverdagi nusxani oʻchiring: `rm /home/archemistry/.ssh/deploy`. Endi `server/` ga tegadigan har oʻzgarish
`main` ga tushib, testlardan oʻtsa — server oʻzi yangilanadi (Actions → «Server — deploy»).

## 7. Toʻlov: Payme va Click

Shartnoma tuzilgach (Payme Business / Click Merchant) kabinetda quyidagi manzillarni koʻrsating:

| Xizmat | Kabinetdagi maydon | Manzil |
|---|---|---|
| Payme | Endpoint URL (Merchant API) | `https://api.archemistry.uz/pay/payme` |
| Payme | Hisob maydoni (account) | `order_id` |
| Click | Prepare URL | `https://api.archemistry.uz/pay/click/prepare` |
| Click | Complete URL | `https://api.archemistry.uz/pay/click/complete` |

Kabinet bergan qiymatlarni serverdagi `.env` ga yozing (chatga emas):

```bash
nano /srv/archemistry/server/.env
#   PAYME_MERCHANT_ID=…   PAYME_KEY=…   PAYME_TEST=1   (sinov kassasi; ishga tushganda 0)
#   CLICK_SERVICE_ID=…    CLICK_MERCHANT_ID=…   CLICK_SECRET=…
systemctl restart archemistry-api
```

**Multicard** (Visa, Mastercard, Uzcard, Humo — bitta sahifa, xorijiy mijozlar uchun): kabinetda callback manzili
`https://api.archemistry.uz/pay/multicard/callback` (sxema «success»). `.env` ga `MULTICARD_APP_ID`, `MULTICARD_SECRET`,
`MULTICARD_STORE_ID`. Avval sinov muhitida (`MULTICARD_BASE=https://dev-mesh.multicard.uz`) bitta toʻlov qilib, summa
birligini tekshiring (`MULTICARD_AMOUNT_UNIT`, sukut — tiyin). Fiskal chek: MXIK `10305008002000000`, qadoq kodi `1514296`.

Qiymat yozilmagan usul ilovada koʻrinmaydi; ikkalasi ham boʻlmasa — «Onlayn toʻlov tez orada ulanadi».

## 8. Ilovada kirishni yoqish

Server ishlayotgani tekshirilgach (`/health`, kod pochtaga keladi, Google tugmasi ishlaydi), ilovadagi bayroq
yoqiladi (`mr/src/account/config.ts` → `AUTH_REQUIRED = true`) — shundan keyin Master rejaning 3-qadamidan
boshlab kirish soʻraladi.

## Kundalik

- Jurnal: `journalctl -u archemistry-api -f`
- Qayta ishga tushirish: `systemctl restart archemistry-api`
- Zaxira nusxalar: `/srv/archemistry/backup/`; tiklash: `pg_restore -d archemistry FAYL.dump`
