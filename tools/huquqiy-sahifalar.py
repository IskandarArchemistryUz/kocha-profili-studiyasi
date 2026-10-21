# -*- coding: utf-8 -*-
# Ishga tushirish (repo ildizida): python3 tools/huquqiy-sahifalar.py .   → oferta.html, maxfiylik.html
"""archemistry.uz: oferta.html va maxfiylik.html — uz (asosiy), en, ru matnlari bitta sahifada; til html[lang] boʻyicha koʻrsatiladi."""
import re, html, sys, pathlib
ROOT = pathlib.Path(sys.argv[1])
src = (ROOT / 'narxlar.html').read_text(encoding='utf-8')
head_end = src.index('</head>')
head = src[:head_end]
body_line = src[src.index('<body'):]
hdr = body_line[body_line.index('<header class="mnav">'):body_line.index('</header>') + 9]
hdr = hdr.replace(' aria-current="page"', '')
foot = body_line[body_line.index('<footer class="mfoot">'):body_line.index('</footer>') + 9]

EDITION = '21.10.2026'
MAIL = 'archemistry.uzbekistan@gmail.com'
REQ = {
 'uz': 'YaTT Soliyev Iskandar Jaxongir oʻgʻli · davlat roʻyxatidan oʻtkazilgan: 08.08.2025, № 7066967 · STIR 563413523 · manzil: Toshkent shahri, Yakkasaroy tumani, Kichik xalqa yoʻli, 28-uy · hisob raqami 20218000907288528001, ATIB «Ipak Yoʻli» Yakkasaroy filiali, MFO 01028 · pochta ' + MAIL + ' · telefon +998 99 430 11 77',
 'en': 'Individual entrepreneur Iskandar Jaxongir oʻgʻli Soliyev · state registration: 08.08.2025, No. 7066967 · TIN 563413523 · address: 28 Kichik Xalqa Yoʻli, Yakkasaroy district, Tashkent, Uzbekistan · account 20218000907288528001, JSCB “Ipak Yuli”, Yakkasaroy branch, bank code (MFO) 01028 · email ' + MAIL + ' · phone +998 99 430 11 77',
 'ru': 'ИП Солиев Искандар Жахонгир угли · государственная регистрация: 08.08.2025, № 7066967 · ИНН 563413523 · адрес: г. Ташкент, Яккасарайский район, ул. Кичик Халка Йули, 28 · р/с 20218000907288528001, АИКБ «Ипак Йули», Яккасарайский филиал, МФО 01028 · эл. почта ' + MAIL + ' · телефон +998 99 430 11 77',
}

OFERTA = {
'uz': ('archemistry.uz xizmatlaridan foydalanish shartnomasi (ommaviy oferta)', [
 ('1. Umumiy qoidalar', 'ol', [
  'Ushbu hujjat yakka tartibdagi tadbirkor Soliyev Iskandar Jaxongir oʻgʻli (davlat roʻyxatidan oʻtkazilgan sana 08.08.2025, № 7066967; STIR 563413523; keyingi oʻrinlarda — «Ijrochi») tomonidan archemistry.uz sayti va uning ilovalari (keyingi oʻrinlarda — «Xizmat») orqali xizmat koʻrsatish boʻyicha ommaviy ofertadir.',
  'Oferta Oʻzbekiston Respublikasi Fuqarolik kodeksining 369-moddasi ikkinchi qismi va «Elektron tijorat toʻgʻrisida»gi OʻRQ-792-son Qonunga muvofiq eʼlon qilinadi.',
  'Foydalanuvchi quyidagi harakatlardan birini bajarib, ofertani toʻliq qabul qiladi (aksept): saytda hisob ochadi (pochta kodi yoki Google orqali kiradi) yoki pullik xizmat uchun toʻlov qiladi.',
  'Ijrochi ofertani oʻzgartirishi mumkin. Yangi tahrir saytga qoʻyilgan kundan kuchga kiradi; toʻlangan obuna yoki tangalar shartlari toʻlov paytidagi tahrir boʻyicha qoladi.']),
 ('2. Xizmat tarkibi', 'ol', [
  '<b>Bepul qism:</b> brauzerda bajariladigan ishlar — hudud tanlash, uchastka chizish, koʻchalar, hajmlar, meʼyoriy hisoblar va boshqa amallar. Ular Foydalanuvchi qurilmasida hisoblanadi; 3-qadamdan boshlab hisob talab qilinadi.',
  '<b>Pullik qism:</b> tangalar (va ishga tushirilganda — obuna) — bulutga saqlash, sunʼiy idrok amallari, belgisiz eksport va narxlar sahifasida koʻrsatilgan boshqa amallar uchun.',
  'Narxlar, tarif tarkibi va har amalning tanga qiymati <a href="narxlar.html">archemistry.uz/narxlar.html</a> va <a href="narxlar-batafsil.html">narxlar-batafsil.html</a> sahifalarida eʼlon qilinadi va ofertaning ajralmas qismi hisoblanadi.']),
 ('3. Narx va toʻlov', 'ol', [
  'Narxlar Oʻzbekiston soʻmida koʻrsatiladi. Toʻlov Payme, Click yoki Multicard orqali Uzcard, Humo, Visa, Mastercard va shu tizimlar qabul qiladigan boshqa kartalar bilan amalga oshiriladi. Xorijiy karta bilan toʻlashda summa soʻmda hisoblanadi; valyuta ayirboshlashni karta bergan bank amalga oshiradi.',
  'Toʻlov tizim tomonidan tasdiqlangan paytdan xizmat koʻrsatilgan hisoblanadi: tangalar hisobga qoʻshiladi (obuna — yoqiladi).',
  'Sotib olingan tangalarning amal qilish muddati cheklanmagan. Obuna shartlari (shu jumladan oylik tangalar) obuna ishga tushirilganda narxlar sahifasida eʼlon qilinadi.',
  'Toʻlov tizimi komissiyasi narxga kiritilgan va Ijrochi zimmasida: Foydalanuvchi narxlar sahifasida koʻrsatilgan summani toʻlaydi.']),
 ('4. Tomonlarning huquq va majburiyatlari', 'ol', [
  'Ijrochi: xizmatni eʼlon qilingan tarkibda koʻrsatadi; texnik ishlar haqida oldindan xabar beradi; Foydalanuvchi maʼlumotlarini <a href="maxfiylik.html">maxfiylik siyosatiga</a> muvofiq himoya qiladi.',
  'Ijrochi qonunni yoki ofertani buzgan hisobni (masalan, avtomatik soʻrovlar bilan xizmatni ishdan chiqarish, boshqalarning hisobidan foydalanish) toʻxtatishi mumkin.',
  'Foydalanuvchi: hisobiga kirish maʼlumotlarini boshqalarga bermaydi; yuklagan fayllariga huquqi borligini kafolatlaydi; xizmatdan qonunga zid maqsadda foydalanmaydi.']),
 ('5. Natijalar va mualliflik huquqi', 'ol', [
  'Foydalanuvchi yaratgan loyihalar, chizmalar va eksport fayllari Foydalanuvchiga tegishli.',
  'Dastur, uning interfeysi, namunalari va kutubxonalari Ijrochiga tegishli; oferta ularga mulkiy huquq bermaydi.',
  'Xizmatdagi meʼyoriy tekshiruvlar va hisoblar yordamchi vosita. Ular davlat ekspertizasi yoki loyihachining kasbiy javobgarligi oʻrnini bosmaydi.']),
 ('6. Pulni qaytarish', 'ol', [
  'Ishlatilmagan tangalar uchun pul toʻlovdan keyin 14 kun ichida yozma soʻrov boʻyicha qaytariladi.',
  'Xizmatda Ijrochi aybi bilan nosozlik boʻlib, pullik amal bajarilmagan boʻlsa, sarflangan tangalar hisobga qaytariladi.',
  'Pul toʻlov qilingan karta yoki hisobga qaytariladi.']),
 ('7. Javobgarlik', 'ol', [
  'Ijrochi xizmatni «mavjud holicha» koʻrsatadi va uchinchi tomon maʼlumotlari (OpenStreetMap, sunʼiy yoʻldosh tasvirlari, relyef) aniqligiga kafolat bermaydi.',
  'Ijrochining javobgarligi Foydalanuvchi oxirgi 12 oyda toʻlagan summa bilan cheklanadi, qonunda boshqacha belgilangan hollar bundan mustasno.']),
 ('8. Nizolar', 'ol', [
  'Shikoyatlar ' + MAIL + ' manziliga yuboriladi; Ijrochi 10 ish kuni ichida javob beradi.',
  'Kelishilmagan nizolar Oʻzbekiston Respublikasi qonunchiligiga muvofiq sudda koʻriladi.']),
 ('9. Ijrochi rekvizitlari', 'p', [REQ['uz']]),
]),
'en': ('Terms of use of archemistry.uz services (public offer)', [
 ('1. General provisions', 'ol', [
  'This document is a public offer by individual entrepreneur Iskandar Jaxongir oʻgʻli Soliyev (state registration of 08.08.2025, No. 7066967; TIN 563413523; hereinafter the “Provider”) for services provided through the archemistry.uz website and its applications (hereinafter the “Service”).',
  'The offer is published in accordance with part two of Article 369 of the Civil Code of the Republic of Uzbekistan and Law No. ZRU-792 “On Electronic Commerce”.',
  'The User fully accepts the offer by doing either of the following: creating an account on the website (signing in with an email code or Google) or paying for a paid service.',
  'The Provider may amend the offer. A new version takes effect on the day it is published on the website; the terms of credits or subscriptions already paid remain as in the version in force at the time of payment.']),
 ('2. Scope of the Service', 'ol', [
  '<b>Free part:</b> work performed in the browser — choosing the area, drawing the site, streets, massing, normative calculations and other operations. They are computed on the User’s device; an account is required from step 3 onwards.',
  '<b>Paid part:</b> credits (and, once launched, subscriptions) — for cloud saving, AI operations, unwatermarked export and other operations listed on the pricing page.',
  'Prices, plan contents and the credit cost of each operation are published at <a href="narxlar.html">archemistry.uz/narxlar.html</a> and <a href="narxlar-batafsil.html">narxlar-batafsil.html</a> and form an integral part of this offer.']),
 ('3. Price and payment', 'ol', [
  'Prices are stated in Uzbek soʻm. Payment is made via Payme, Click or Multicard with Uzcard, Humo, Visa, Mastercard and other cards accepted by these systems. When paying with a foreign card the amount is charged in soʻm; currency conversion is performed by the card-issuing bank.',
  'The service is deemed rendered once the payment is confirmed by the payment system: credits are added to the account (or the subscription is activated).',
  'Purchased credits do not expire. Subscription terms (including monthly credits) will be published on the pricing page when subscriptions are launched.',
  'The payment system fee is included in the price and borne by the Provider: the User pays the amount shown on the pricing page.']),
 ('4. Rights and obligations of the parties', 'ol', [
  'The Provider: delivers the Service as published; gives advance notice of maintenance; protects the User’s data in accordance with the <a href="maxfiylik.html">privacy policy</a>.',
  'The Provider may suspend an account that breaches the law or this offer (for example, disrupting the Service with automated requests or using someone else’s account).',
  'The User: does not share account access; warrants having the rights to uploaded files; does not use the Service for unlawful purposes.']),
 ('5. Results and copyright', 'ol', [
  'Projects, drawings and export files created by the User belong to the User.',
  'The software, its interface, templates and libraries belong to the Provider; this offer grants no proprietary rights to them.',
  'Normative checks and calculations in the Service are an auxiliary tool. They do not replace state expertise or the designer’s professional responsibility.']),
 ('6. Refunds', 'ol', [
  'Payment for unused credits is refunded upon written request within 14 days after payment.',
  'If a paid operation was not performed due to a fault of the Service attributable to the Provider, the credits spent are returned to the account.',
  'Refunds are made to the card or account used for payment.']),
 ('7. Liability', 'ol', [
  'The Provider delivers the Service “as is” and does not guarantee the accuracy of third-party data (OpenStreetMap, satellite imagery, terrain).',
  'The Provider’s liability is limited to the amount paid by the User in the last 12 months, except where the law provides otherwise.']),
 ('8. Disputes', 'ol', [
  'Complaints are sent to ' + MAIL + '; the Provider responds within 10 business days.',
  'Unresolved disputes are settled in court under the laws of the Republic of Uzbekistan.']),
 ('9. Provider details', 'p', [REQ['en']]),
]),
'ru': ('Договор об использовании сервисов archemistry.uz (публичная оферта)', [
 ('1. Общие положения', 'ol', [
  'Настоящий документ является публичной офертой индивидуального предпринимателя Солиева Искандара Жахонгир угли (дата государственной регистрации 08.08.2025, № 7066967; ИНН 563413523; далее — «Исполнитель») об оказании услуг через сайт archemistry.uz и его приложения (далее — «Сервис»).',
  'Оферта опубликована в соответствии с частью второй статьи 369 Гражданского кодекса Республики Узбекистан и Законом «Об электронной коммерции» № ЗРУ-792.',
  'Пользователь полностью принимает оферту (акцепт), совершив одно из действий: создаёт учётную запись на сайте (входит по коду из почты или через Google) либо оплачивает платную услугу.',
  'Исполнитель вправе изменять оферту. Новая редакция вступает в силу со дня публикации на сайте; условия уже оплаченных монет или подписки сохраняются по редакции, действовавшей на момент оплаты.']),
 ('2. Состав Сервиса', 'ol', [
  '<b>Бесплатная часть:</b> работа в браузере — выбор территории, построение участка, улицы, объёмы, нормативные расчёты и другие операции. Они выполняются на устройстве Пользователя; начиная с 3-го шага требуется учётная запись.',
  '<b>Платная часть:</b> монеты (и, после запуска, подписка) — для облачного хранения, операций искусственного интеллекта, экспорта без водяного знака и других операций, указанных на странице цен.',
  'Цены, состав тарифов и стоимость каждой операции в монетах публикуются на страницах <a href="narxlar.html">archemistry.uz/narxlar.html</a> и <a href="narxlar-batafsil.html">narxlar-batafsil.html</a> и являются неотъемлемой частью оферты.']),
 ('3. Цена и оплата', 'ol', [
  'Цены указаны в узбекских сумах. Оплата производится через Payme, Click или Multicard картами Uzcard, Humo, Visa, Mastercard и другими картами, принимаемыми этими системами. При оплате иностранной картой сумма списывается в сумах; конвертацию выполняет банк, выпустивший карту.',
  'Услуга считается оказанной с момента подтверждения платежа платёжной системой: монеты зачисляются на счёт (подписка — активируется).',
  'Срок действия купленных монет не ограничен. Условия подписки (включая ежемесячные монеты) будут опубликованы на странице цен при её запуске.',
  'Комиссия платёжной системы включена в цену и оплачивается Исполнителем: Пользователь платит сумму, указанную на странице цен.']),
 ('4. Права и обязанности сторон', 'ol', [
  'Исполнитель: оказывает услугу в объявленном составе; заранее уведомляет о технических работах; защищает данные Пользователя в соответствии с <a href="maxfiylik.html">политикой конфиденциальности</a>.',
  'Исполнитель вправе приостановить учётную запись, нарушающую закон или оферту (например, вывод Сервиса из строя автоматическими запросами, использование чужой учётной записи).',
  'Пользователь: не передаёт доступ к учётной записи третьим лицам; гарантирует наличие прав на загружаемые файлы; не использует Сервис в противоправных целях.']),
 ('5. Результаты и авторские права', 'ol', [
  'Проекты, чертежи и файлы экспорта, созданные Пользователем, принадлежат Пользователю.',
  'Программа, её интерфейс, шаблоны и библиотеки принадлежат Исполнителю; оферта не передаёт на них имущественных прав.',
  'Нормативные проверки и расчёты в Сервисе являются вспомогательным инструментом и не заменяют государственную экспертизу или профессиональную ответственность проектировщика.']),
 ('6. Возврат средств', 'ol', [
  'Оплата за неиспользованные монеты возвращается по письменному запросу в течение 14 дней после оплаты.',
  'Если платная операция не выполнена из-за сбоя Сервиса по вине Исполнителя, потраченные монеты возвращаются на счёт.',
  'Средства возвращаются на карту или счёт, с которых была произведена оплата.']),
 ('7. Ответственность', 'ol', [
  'Исполнитель оказывает услугу «как есть» и не гарантирует точность данных третьих лиц (OpenStreetMap, спутниковые снимки, рельеф).',
  'Ответственность Исполнителя ограничена суммой, уплаченной Пользователем за последние 12 месяцев, за исключением случаев, установленных законом.']),
 ('8. Споры', 'ol', [
  'Претензии направляются на ' + MAIL + '; Исполнитель отвечает в течение 10 рабочих дней.',
  'Неурегулированные споры рассматриваются в суде в соответствии с законодательством Республики Узбекистан.']),
 ('9. Реквизиты Исполнителя', 'p', [REQ['ru']]),
]),
}

def tbl(rows):
    h = rows[0]; b = rows[1:]
    return '<table><thead><tr>' + ''.join(f'<th>{c}</th>' for c in h) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in b) + '</tbody></table>'

PRIV = {
'uz': ('archemistry.uz — shaxsga doir maʼlumotlarni qayta ishlash siyosati', 'Operator: YaTT Soliyev Iskandar Jaxongir oʻgʻli, STIR 563413523, manzil: Toshkent shahri, Yakkasaroy tumani, Kichik xalqa yoʻli, 28-uy, pochta ' + MAIL + '.', [
 ('1. Qanday maʼlumot yigʻiladi', 'raw', [tbl([
  ['Maʼlumot', 'Qachon', 'Nima uchun'],
  ['Pochta manzili', 'pochta kodi yoki Google bilan kirganda', 'hisob ochish, kirish kodi yuborish'],
  ['Ism (Google hisobidagi)', 'Google bilan kirganda', 'hisobda koʻrsatish'],
  ['Google hisob identifikatori', 'Google bilan kirganda', 'hisobni Google bilan bogʻlash'],
  ['Tangalar va toʻlovlar tarixi', 'toʻlov va pullik amalda', 'balans, hisob-kitob, pulni qaytarish'],
  ['IP manzil', 'har soʻrovda', 'ortiqcha soʻrovlardan himoya, server jurnali']]),
  '<p>Karta raqami Ijrochiga kelmaydi: uni faqat toʻlov tizimi (Payme, Click yoki Multicard) qayta ishlaydi; bizga faqat toʻlov natijasi va kartaning yashirilgan raqami (masalan, 8600 **** 5959) keladi. Kirish kodi va sessiya kaliti bazada ochiq holda emas, faqat xesh koʻrinishida saqlanadi.</p>']),
 ('2. Loyihalaringiz', 'p', ['Chizilgan loyihalar Foydalanuvchi brauzerida (qurilmasida) saqlanadi va serverga yuborilmaydi. Bulutga saqlash yoqilganda loyiha serverda saqlanadi — bu haqda alohida xabar beriladi.']),
 ('3. Qayerda va qancha saqlanadi', 'ol', [
  'Shaxsga doir maʼlumotlar Oʻzbekiston Respublikasi hududidagi serverda saqlanadi.',
  'Hisob maʼlumotlari hisob oʻchirilguncha saqlanadi; toʻlov yozuvlari — soliq va buxgalteriya qonunchiligi talab qilgan muddat. Kirish kodi 10 daqiqada eskiradi, sessiya — 60 kunda.',
  'Zaxira nusxalar 14 kun saqlanadi.']),
 ('4. Kimga beriladi', 'ul', [
  '<b>Google</b> — Google bilan kirishni tanlasangiz;',
  '<b>pochta xizmati</b> — kirish kodini yuborish uchun;',
  '<b>Payme, Click, Multicard</b> — toʻlov uchun;',
  'xarita manbalari (OpenStreetMap, OpenFreeMap, Esri, AWS relyef plitkalari) — xarita yuklanganda brauzeringiz ularga toʻgʻridan-toʻgʻri murojaat qiladi va IP manzilingizni koʻradi;',
  'davlat organlariga — faqat qonunda belgilangan hollarda.'], 'Maʼlumot sotilmaydi. Faqat xizmat ishlashi uchun zarur hajmda:'),
 ('5. Cookie va brauzer xotirasi', 'ul', [
  '<code>ks_sess</code> — kirish sessiyasi (60 kun, faqat server oʻqiydi).',
  'Brauzer xotirasida — til, rejim, loyihalar va sozlamalar.',
  'Statistika: GoatCounter, cookiesiz va shaxsga doir maʼlumotsiz — faqat hodisa nomi (masalan, qaysi qadam ochilgani). «Do Not Track» yoqilgan boʻlsa — hech narsa yuborilmaydi.']),
 ('6. Huquqlaringiz', 'p', ['Maʼlumotlaringiz haqida bilish, ularni tuzatish, oʻchirish va qayta ishlashga roziligingizni qaytarib olish huquqingiz bor. Soʻrovni ' + MAIL + ' manziliga yuboring; javob 10 ish kuni ichida beriladi. Hisob oʻchirilsa, kirib boʻlmaydi va ishlatilmagan tangalar yoʻqoladi (<a href="oferta.html">ofertaning 6-boʻlimi</a>dagi qaytarish shartlari bundan mustasno).']),
 ('7. Rozilik', 'p', ['Hisob ochib, Foydalanuvchi ushbu siyosatda koʻrsatilgan maʼlumotlarni koʻrsatilgan maqsadlarda qayta ishlashga rozilik beradi.']),
]),
'en': ('archemistry.uz — personal data processing policy', 'Operator: individual entrepreneur Iskandar Jaxongir oʻgʻli Soliyev, TIN 563413523, address: 28 Kichik Xalqa Yoʻli, Yakkasaroy district, Tashkent, Uzbekistan, email ' + MAIL + '.', [
 ('1. What data we collect', 'raw', [tbl([
  ['Data', 'When', 'Why'],
  ['Email address', 'when signing in with an email code or Google', 'creating the account, sending sign-in codes'],
  ['Name (from the Google account)', 'when signing in with Google', 'showing it in the account'],
  ['Google account identifier', 'when signing in with Google', 'linking the account to Google'],
  ['Credit and payment history', 'on payment and paid operations', 'balance, accounting, refunds'],
  ['IP address', 'on every request', 'protection against excessive requests, server logs']]),
  '<p>Card numbers never reach the Provider: they are processed only by the payment system (Payme, Click or Multicard); we receive only the payment result and a masked card number (e.g. 8600 **** 5959). Sign-in codes and session keys are not stored in plain form, only as hashes.</p>']),
 ('2. Your projects', 'p', ['Drawn projects are stored in the User’s browser (on the device) and are not sent to the server. When cloud saving is enabled, the project is stored on the server — you will be notified separately.']),
 ('3. Where and how long data is stored', 'ol', [
  'Personal data is stored on a server located in the Republic of Uzbekistan.',
  'Account data is kept until the account is deleted; payment records — for the period required by tax and accounting law. Sign-in codes expire in 10 minutes, sessions in 60 days.',
  'Backups are kept for 14 days.']),
 ('4. Who receives data', 'ul', [
  '<b>Google</b> — if you choose to sign in with Google;',
  '<b>email service</b> — to send sign-in codes;',
  '<b>Payme, Click, Multicard</b> — for payments;',
  'map sources (OpenStreetMap, OpenFreeMap, Esri, AWS terrain tiles) — when maps load, your browser contacts them directly and they see your IP address;',
  'state authorities — only in cases established by law.'], 'Data is never sold. It is shared only to the extent necessary for the Service to work:'),
 ('5. Cookies and browser storage', 'ul', [
  '<code>ks_sess</code> — sign-in session (60 days, read only by the server).',
  'Browser storage — language, theme, projects and settings.',
  'Analytics: GoatCounter, cookieless and without personal data — only the event name (e.g. which step was opened). With “Do Not Track” enabled nothing is sent.']),
 ('6. Your rights', 'p', ['You have the right to know about your data, to correct and delete it, and to withdraw your consent to its processing. Send requests to ' + MAIL + '; we respond within 10 business days. If the account is deleted, it can no longer be accessed and unused credits are lost (except for the refund terms in <a href="oferta.html">section 6 of the offer</a>).']),
 ('7. Consent', 'p', ['By creating an account, the User consents to the processing of the data listed in this policy for the stated purposes.']),
]),
'ru': ('archemistry.uz — политика обработки персональных данных', 'Оператор: ИП Солиев Искандар Жахонгир угли, ИНН 563413523, адрес: г. Ташкент, Яккасарайский район, ул. Кичик Халка Йули, 28, эл. почта ' + MAIL + '.', [
 ('1. Какие данные собираются', 'raw', [tbl([
  ['Данные', 'Когда', 'Зачем'],
  ['Адрес эл. почты', 'при входе по коду из почты или через Google', 'создание учётной записи, отправка кода входа'],
  ['Имя (из учётной записи Google)', 'при входе через Google', 'отображение в учётной записи'],
  ['Идентификатор учётной записи Google', 'при входе через Google', 'привязка учётной записи к Google'],
  ['История монет и платежей', 'при оплате и платных операциях', 'баланс, расчёты, возвраты'],
  ['IP-адрес', 'при каждом запросе', 'защита от избыточных запросов, журнал сервера']]),
  '<p>Номер карты к Исполнителю не поступает: его обрабатывает только платёжная система (Payme, Click или Multicard); мы получаем лишь результат платежа и маскированный номер карты (например, 8600 **** 5959). Код входа и ключ сессии хранятся не в открытом виде, а только в виде хеша.</p>']),
 ('2. Ваши проекты', 'p', ['Нарисованные проекты хранятся в браузере (на устройстве) Пользователя и на сервер не отправляются. При включении облачного хранения проект хранится на сервере — об этом сообщается отдельно.']),
 ('3. Где и сколько хранятся данные', 'ol', [
  'Персональные данные хранятся на сервере на территории Республики Узбекистан.',
  'Данные учётной записи хранятся до её удаления; записи о платежах — в течение срока, установленного налоговым и бухгалтерским законодательством. Код входа действует 10 минут, сессия — 60 дней.',
  'Резервные копии хранятся 14 дней.']),
 ('4. Кому передаются', 'ul', [
  '<b>Google</b> — если вы выбрали вход через Google;',
  '<b>почтовый сервис</b> — для отправки кода входа;',
  '<b>Payme, Click, Multicard</b> — для оплаты;',
  'источники карт (OpenStreetMap, OpenFreeMap, Esri, тайлы рельефа AWS) — при загрузке карты ваш браузер обращается к ним напрямую, и они видят ваш IP-адрес;',
  'государственным органам — только в случаях, установленных законом.'], 'Данные не продаются. Передаются только в объёме, необходимом для работы Сервиса:'),
 ('5. Cookie и память браузера', 'ul', [
  '<code>ks_sess</code> — сессия входа (60 дней, читает только сервер).',
  'В памяти браузера — язык, тема, проекты и настройки.',
  'Статистика: GoatCounter, без cookie и без персональных данных — только название события (например, какой шаг открыт). При включённом «Do Not Track» ничего не отправляется.']),
 ('6. Ваши права', 'p', ['Вы вправе знать о своих данных, исправлять и удалять их, а также отозвать согласие на обработку. Направьте запрос на ' + MAIL + '; ответ — в течение 10 рабочих дней. При удалении учётной записи вход становится невозможен, неиспользованные монеты сгорают (за исключением условий возврата в <a href="oferta.html">разделе 6 оферты</a>).']),
 ('7. Согласие', 'p', ['Создавая учётную запись, Пользователь даёт согласие на обработку указанных в политике данных в указанных целях.']),
]),
}

LBL = {
 'uz': ('Tahrir sanasi', 'Matnlar oʻzbek, ingliz va rus tillarida eʼlon qilinadi; nomuvofiqlik boʻlsa, oʻzbekcha matn ustun turadi.', 'Ommaviy oferta', 'Maxfiylik siyosati'),
 'en': ('Version of', 'Published in Uzbek, English and Russian; in case of discrepancy the Uzbek text prevails.', 'Public offer', 'Privacy policy'),
 'ru': ('Редакция от', 'Тексты опубликованы на узбекском, английском и русском языках; при расхождении приоритет имеет текст на узбекском языке.', 'Публичная оферта', 'Политика конфиденциальности'),
}

def section(title, kind, items, lead=None):
    out = f'<h2>{title}</h2>'
    if lead: out += f'<p>{lead}</p>'
    if kind == 'ol': out += '<ol>' + ''.join(f'<li>{x}</li>' for x in items) + '</ol>'
    elif kind == 'ul': out += '<ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>'
    elif kind == 'p': out += ''.join(f'<p>{x}</p>' for x in items)
    else: out += ''.join(items)
    return out

def page(fname, title_uz, desc, data, other_href, other_idx, intro=False):
    blocks = ''
    for l in ('uz', 'en', 'ru'):
        d = data[l]
        if intro: h1, opr, secs = d
        else: (h1, secs), opr = d, None
        body = f'<h1>{h1}</h1><p class="lmeta">{LBL[l][0]}: {EDITION}</p>'
        if opr: body += f'<p>{opr}</p>'
        for s in secs: body += section(*s)
        body += f'<p class="lnote">{LBL[l][1]}</p><p class="lnote"><a href="{other_href}">{LBL[l][other_idx]} →</a></p>'
        blocks += f'<article class="legal" data-l="{l}" lang="{l}">{body}</article>'
    h = head.replace('<title>Narxlar · Archemistry Lab</title>', f'<title>{title_uz} · Archemistry Lab</title>')
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(desc)}">', h)
    css = ('<style>.legalwrap{max-width:760px;margin:0 auto;padding:96px 24px 80px}'
           '.legal{display:none;font-size:15px;line-height:1.6}'
           'html[lang=uz] .legal[data-l=uz],html[lang=en] .legal[data-l=en],html[lang=ru] .legal[data-l=ru]{display:block}'
           '.legal h1{font-size:30px;line-height:1.15;letter-spacing:-.02em;font-weight:600;margin:0 0 8px}'
           '.legal h2{font-size:18px;font-weight:600;margin:32px 0 8px}'
           '.legal ol,.legal ul{padding-left:22px;margin:0}.legal li{margin:6px 0}'
           '.legal table{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0}'
           '.legal th,.legal td{text-align:left;padding:8px 10px;border-bottom:.5px solid var(--hairline);vertical-align:top}'
           '.legal a{color:inherit}.legal .lmeta,.legal .lnote{color:var(--mut2,#8a8780);font-size:13px}'
           '.legal code{font-family:"IBM Plex Mono",monospace;font-size:13px}'
           '@media (max-width:640px){.legal table{font-size:13px}.legal th,.legal td{padding:6px}}</style>')
    h = h + css + '\n'
    out = (h + '</head>\n<body class="site min legalpg">\n<div class="st th">' + hdr +
           f'<main class="legalwrap">{blocks}</main>' + foot + '</div>\n'
           '<script src="js/home-i18n.js?v=4"></script>\n<script src="js/site.js?v=6"></script>\n</body>\n</html>\n')
    (ROOT / fname).write_text(out, encoding='utf-8')

page('oferta.html', 'Ommaviy oferta', 'archemistry.uz xizmatlaridan foydalanish shartnomasi (ommaviy oferta): xizmat tarkibi, narx va toʻlov, pulni qaytarish, rekvizitlar.', OFERTA, 'maxfiylik.html', 3)
page('maxfiylik.html', 'Maxfiylik siyosati', 'archemistry.uz shaxsga doir maʼlumotlarni qayta ishlash siyosati: qanday maʼlumot, qayerda saqlanadi, kimga beriladi, huquqlaringiz.', PRIV, 'oferta.html', 2, intro=True)
print('ok')
