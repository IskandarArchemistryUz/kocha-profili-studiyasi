# Loyihalar bulutda va yagona loyiha qobig'i — reja (14.11.2026)

## Muammo
Master rejadan Koʻchasoz / Joyshunos / Chizmadon'ga o'tganda loyihaga qaytish yo'qoladi; loyihalar faqat brauzerda saqlanadi.

## Qarorlar (Iskandar)
- Loyiha akkauntda saqlanadi, istalgan qurilmadan ochiladi. Desktop ilova kerak emas.
- Brauzerdagi mavjud loyihalar bulutga **foydalanuvchi o'zi tanlab** ko'chiradi (avtomatik emas); brauzerdan o'chirilmaydi.
- Xizmatlar Master reja loyihasi ichida rejim bo'ladi (o'sha loyihaga yozadi, boshqasiga aralashmaydi); bosh sahifadan har xizmatning alohida eshigi va o'z loyihalar ro'yxati. Render ham loyiha ichida rejim; Binokor, Bogʻshunos uchun tur oldindan ajratilgan.
- Har xizmatda kunduzgi/tungi rejim, yumshoq o'tish animatsiyasi.

## PR tartibi va holat
1. **Server** — `projects` jadvali va API — **BAJARILDI (PR #620, 13.11 birlashdi, deploy o'tdi)**. Hujjat R2 da (`projects/` prefiks, gzip, presigned PUT — nginx 128 KB chegarasi), versiya, 409 konflikt, oxirgi 5 nusxa, savat 30 kun, chegaralar (loyiha ≤ 30 MB, hisob ≤ 500 MB `PROJECTS_QUOTA_MB`, ≤ 300 loyiha; egasiga yo'q).
2. **Master reja bulutga** — **BAJARILDI (PR #625, 13.11 birlashdi)**. `mr/src/storage/cloud.ts`, `mr/src/ui/cloudui.ts`: tanlab ko'chirish, «saqlandi · bulutda», 4 s fon sinxron, ziddiyat oynasi («Bulutdagisini ochish» — shu nusxa alohida loyiha bo'lib qoladi / «Shu nusxani bulutga yozish»), ochilganda yangiroq nusxa taklifi, brauzerda yo'q loyiha — bulutdan yuklanadi. Bulutga ko'chirilmagan loyihada belgi qisqa «saqlandi» (yuqori panel kk 1600 px sig'ishi uchun).
3. **Yagona loyiha qobig'i** — xizmatlar loyiha ichida rejim, alohida eshiklar. Keyingi.
4. **Yangi dizayn** — kanvas interfeyslari xizmatma-xizmat (`claude/topshiriq-interfeyslar-kanvas-14-11.md`).

## Eslatma
Parallel chatlar main'ni tez-tez o'zgartiradi: `app/` yig'ilmasi va i18n JSON har safar konflikt beradi. Yechim: origin/main ustiga manba commitni cherry-pick, i18n kalitlarini qayta qo'shish, `mr` da `npm run build`, `app/` + `css/` commit, force-push; yashil bo'lishi bilan darhol birlashtirish.
