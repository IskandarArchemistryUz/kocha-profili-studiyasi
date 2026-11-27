/* Yershunos — mahalliy maʼlumot va AI (27.11.2026).
   Nima qiladi: hokimiyat yoki loyiha jamoasi oʻz maʼlumotini (matn, jadval, CSV) beradi; AI qiymatlarni tuman/shahar va
   koʻrsatkichlarga moslab TAKLIF qiladi; foydalanuvchi jadvalni koʻrib «Saqlash» ni bosadi. Saqlangan qiymat tuman kartasida
   va tuman hisobotida rasmiy son yonida «kiritilgan» belgisi va manbasi bilan chiqadi. Reyting va indeks qayta hisoblanmaydi.
   Qoidalar:
   - Model chaqiruvi Lab serverida (/agent/*: markaziy kalit, tanga, chegaralar). Buyruqlar shu yerda, brauzerda bajariladi;
     nomlari server/src/agent-tools.js dagi YS roʻyxati bilan bir xil boʻlishi shart.
   - AI son oʻylab topa olmaydi: ys_propose har qiymatni foydalanuvchi bergan matn/fayldagi sonlar bilan solishtiradi
     (ming / million / ulush → foiz oʻgirishlari bilan); topilmasa — rad.
   - Saqlash Lab hisobiga bogʻlangan: /projects (tur `yershunos`, hujjat `ys_kiritma_v1`, meta.kind = 'kiritma').
     Brauzerda nusxa: localStorage `ys-kiritma@<foydalanuvchi id>`. Bulut ishlamasa — brauzerda qoladi, keyingi saqlashda yuboriladi.
   - Sahifa ochilganda tarmoqqa chiqilmaydi, faqat shu brauzerda avval kirilgan boʻlsa (`ys-kirgan`) saqlanganlar yuklanadi.
   Sahifaga ulanish (index.html): uzPick → YSK.blok(p), hbBloklar (tuman) → YSK.hisobot(p). Matnlar: T() + shu fayldagi lugʻat. */
(function () {
  'use strict';
  if (typeof T !== 'function') return;
  var d = document, D = window.YERSHUNOS_I18N || {};
  var I18 = {
    "Mahalliy ma'lumot": ['Local data', 'Местные данные'],
    "Mahalliy ma'lumot kiritish (AI)": ['Enter local data (AI)', 'Ввести местные данные (ИИ)'],
    "＋ Mahalliy ma'lumot kiritish": ['＋ Enter local data', '＋ Ввести местные данные'],
    "Mahalliy ma'lumot · foydalanuvchi kiritgan": ['Local data · entered by the user', 'Местные данные · введены пользователем'],
    "Mahalliy ma'lumot (foydalanuvchi kiritgan)": ['Local data (entered by the user)', 'Местные данные (введены пользователем)'],
    "rasmiy: {0}": ['official: {0}', 'официально: {0}'],
    "Reyting va indeks hisobiga kirmaydi.": ['Not included in the ranking or the index.', 'В рейтинг и индекс не входит.'],
    "Bu qiymatlarni foydalanuvchi kiritgan; ular tekshirilmagan va ustuvorlik reytingi hamda zaiflik indeksi hisobiga kirmagan.": ['These values were entered by the user; they are unverified and are not included in the priority ranking or the vulnerability index.', 'Эти значения введены пользователем; они не проверены и не входят в рейтинг приоритетности и индекс уязвимости.'],
    "Ko'rsatkich": ['Indicator', 'Показатель'], "Qiymat": ['Value', 'Значение'], "Yil": ['Year', 'Год'], "Manba": ['Source', 'Источник'], "Rasmiy (stat.uz)": ['Official (stat.uz)', 'Официально (stat.uz)'], "Hudud": ['Area', 'Территория'],
    "Yopish": ['Close', 'Закрыть'], "Kiritish": ['Enter data', 'Ввод'], "Savol": ['Question', 'Вопрос'], "Turi": ['Type', 'Тип'],
    "Tuman yoki shahar bo'yicha o'z ma'lumotingizni yozing yoki jadval (CSV) biriktiring. AI qiymatlarni ko'rsatkichlarga moslaydi; saqlashdan oldin jadvalni ko'rasiz.": ['Type your own data for a district or city, or attach a table (CSV). The AI maps the values to indicators; you see the table before anything is saved.', 'Напишите свои данные по району или городу либо прикрепите таблицу (CSV). ИИ сопоставит значения с показателями; перед сохранением вы увидите таблицу.'],
    "Har qiymatga yil va manba kerak. AI son o'ylab topmaydi: faqat siz bergan qiymatlar kiritiladi.": ['Every value needs a year and a source. The AI does not invent numbers: only the values you supply are entered.', 'Каждому значению нужны год и источник. ИИ не придумывает числа: вводятся только ваши значения.'],
    "Baxmal tumani: ichimlik suvi 71 %, kanalizatsiya 12 %. 2026-yil, manba: tuman hokimligi": ['Baxmal district: drinking water 71 %, sewerage 12 %. Year 2026, source: district administration', 'Район Baxmal: питьевая вода 71 %, канализация 12 %. 2026 год, источник: хокимият района'],
    "Bu tumanda qaysi ko'rsatkichlar bo'sh?": ['Which indicators are empty for this district?', 'Какие показатели по этому району пусты?'],
    "Ma'lumotni yozing yoki jadval biriktiring…": ['Type the data or attach a table…', 'Напишите данные или прикрепите таблицу…'],
    "Jadval yoki matn fayli (CSV, TSV, TXT)": ['Table or text file (CSV, TSV, TXT)', 'Таблица или текстовый файл (CSV, TSV, TXT)'],
    "Yuborish": ['Send', 'Отправить'], "To'xtatish": ['Stop', 'Остановить'], "To'xtatildi": ['Stopped', 'Остановлено'],
    "{0} tanga": ['Coins: {0}', 'Монет: {0}'], "bepul": ['free', 'бесплатно'], "Balans: {0} tanga": ['Balance, coins: {0}', 'Баланс, монет: {0}'], "Bepul savol: {0}": ['Free questions: {0}', 'Бесплатных вопросов: {0}'],
    "Saqlangan qiymatlar · {0}": ['Saved values · {0}', 'Сохранённые значения · {0}'], "Hali kiritilgan qiymat yo'q.": ['No values entered yet.', 'Значений пока нет.'],
    "O'chirish": ['Delete', 'Удалить'], "Saqlash": ['Save', 'Сохранить'], "Bekor": ['Cancel', 'Отмена'], "Bekor qilindi": ['Cancelled', 'Отменено'],
    "Saqlashga tayyor · {0} ta qiymat": ['Ready to save · {0} values', 'Готово к сохранению · значений: {0}'],
    "Saqlandi · Lab hisobingizda": ['Saved · in your Lab account', 'Сохранено · в вашем аккаунте Lab'],
    "Brauzerda saqlandi. Bulut hozir javob bermadi: keyingi saqlashda hisobingizga yuboriladi.": ['Saved in this browser. The cloud did not respond: it will be sent to your account on the next save.', 'Сохранено в этом браузере. Облако не ответило: данные уйдут в аккаунт при следующем сохранении.'],
    "Rasmiy sondan katta farq — xato emasligini tekshiring": ['Large difference from the official figure — check for a typo', 'Большое расхождение с официальным значением — проверьте, нет ли опечатки'],
    "Ma'lumotni o'qiyapti": ['Reading the data', 'Читает данные'], "Hudud nomlarini qidiryapti": ['Looking up place names', 'Ищет названия территорий'], "Tuman ko'rsatkichlarini ko'ryapti": ['Looking at the district indicators', 'Смотрит показатели района'], "Qiymatlarni tekshiryapti": ['Checking the values', 'Проверяет значения'], "O'ylayapti": ['Thinking', 'Думает'],
    "Hisobga kirish": ['Sign in', 'Вход в аккаунт'], "Ma'lumot Lab hisobingizda saqlanadi. Parol kerak emas: pochtangizga 6 xonali kod yuboramiz.": ['The data is saved in your Lab account. No password: we email you a 6-digit code.', 'Данные сохраняются в вашем аккаунте Lab. Пароль не нужен: пришлём 6-значный код на почту.'],
    "Pochta manzili": ['Email address', 'Адрес почты'], "6 xonali kod": ['6-digit code', '6-значный код'], "Kod yuborish": ['Send code', 'Отправить код'], "Kirish": ['Sign in', 'Войти'], "Kod yuborildi: {0}": ['Code sent: {0}', 'Код отправлен: {0}'], "Kirdingiz": ['Signed in', 'Вы вошли'],
    "AI uchun hisobingizga kiring": ['Sign in to use the AI', 'Войдите в аккаунт, чтобы использовать ИИ'], "Tanga yetarli emas": ['Not enough coins', 'Недостаточно монет'], "Tanga olish": ['Get coins', 'Получить монеты'],
    "AI yordamchi bu xizmatda hozircha yoqilmagan.": ['The AI assistant is not enabled for this service yet.', 'ИИ-помощник в этом сервисе пока не включён.'],
    "Server bilan aloqa yo'q. Internetni tekshiring.": ['No connection to the server. Check your internet.', 'Нет связи с сервером. Проверьте интернет.'],
    "AI javob bermadi. Birozdan keyin urinib ko'ring.": ['The AI did not answer. Try again a little later.', 'ИИ не ответил. Попробуйте немного позже.'],
    "Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring.": ['Too many requests. Try again in a minute.', 'Слишком много запросов. Попробуйте через минуту.'],
    "Qadamlar chegarasi tugadi — so'rovni qisqaroq qilib qayta yuboring.": ['Step limit reached — send a shorter request.', 'Лимит шагов исчерпан — отправьте запрос короче.'],
    "Fayl juda katta: birinchi {0} ming belgi olindi.": ['The file is too large: the first {0} thousand characters were taken.', 'Файл слишком большой: взяты первые {0} тыс. знаков.'],
    "Excel faylini CSV qilib saqlang yoki jadvalni nusxalab shu yerga qo'ying.": ['Save the Excel file as CSV, or copy the table and paste it here.', 'Сохраните файл Excel как CSV или скопируйте таблицу и вставьте сюда.'],
    "Faylni o'qib bo'lmadi": ['Could not read the file', 'Не удалось прочитать файл'],
    "Javobdagi bu sonlar manbada topilmadi: {0}": ['These numbers in the answer were not found in the source: {0}', 'Эти числа из ответа не найдены в источнике: {0}'],
    "Aholi soni": ['Population', 'Численность населения'], "kishi": ['people', 'чел.'],
    "Ichimlik suvi bilan ta'minlanganlik": ['Drinking water coverage', 'Обеспеченность питьевой водой'],
    "Kanalizatsiya bilan ta'minlanganlik": ['Sewerage coverage', 'Обеспеченность канализацией'],
    "Tabiiy gaz bilan ta'minlanganlik": ['Natural gas coverage', 'Обеспеченность природным газом'],
    "Isitish tizimi bilan ta'minlanganlik": ['Heating system coverage', 'Обеспеченность отоплением'],
    "O'rtacha oylik ish haqi": ['Average monthly wage', 'Средняя месячная зарплата'], "so'm": ['UZS', 'сум'],
    "Ishsizlik darajasi": ['Unemployment rate', 'Уровень безработицы'],
    "0–15 yoshdagilar ulushi": ['Share aged 0–15', 'Доля населения 0–15 лет'],
    "60 va undan katta yoshdagilar ulushi": ['Share aged 60 and over', 'Доля населения 60 лет и старше'],
    "10 000 kishiga shifokorlar": ['Doctors per 10,000 people', 'Врачей на 10 000 жителей'],
    "10 000 kishiga shifoxona o'rinlari": ['Hospital beds per 10,000 people', 'Больничных коек на 10 000 жителей'],
    "Uy-joy bilan ta'minlanganlik": ['Housing space per person', 'Обеспеченность жильём'], "m²/kishi": ['m² per person', 'м²/чел.'],
    "Kambag'allik darajasi": ['Poverty rate', 'Уровень бедности'],
    "Maktabgacha ta'lim qamrovi": ['Preschool enrolment', 'Охват дошкольным образованием'],
    "Paxsa va xom g'ishtli uylar ulushi": ['Share of adobe and mud-brick houses', 'Доля домов из пахсы и сырцового кирпича'],
  };
  for (var k0 in I18) if (!(k0 in D)) D[k0] = I18[k0];

  var ls = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lset = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* xotira yopiq */ } };
  var API = function () { var h = location.hostname; return (h === 'localhost' || h === '127.0.0.1' ? ls('kps_api') : null) || 'https://api.archemistry.uz'; };
  var LANG = function () { return /^(uz|en|ru|es|pt|fr|az|uk|tr|kk)$/.test(T.L) ? T.L : 'uz'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var MAXR = 30000;
  var enc = function (v) { var s; try { s = JSON.stringify(v == null ? null : v); } catch (e) { s = '"?"'; } return s.length > MAXR ? s.slice(0, MAXR) + '…(qisqartirildi)' : s; };
  var YIL = new Date().getFullYear();

  /* ——— koʻrsatkichlar katalogi: kalit, nom, birlik, oraliq, kasr xonasi, rasmiy qiymat (qiymat, yil) ——— */
  var jf = function (k) { return function (p) { return p.j && p.j[k] != null ? [p.j[k], k === 'uy' ? p.j.uy_y || 2025 : 2025] : null; }; };
  var F = [
    ['aholi', "Aholi soni", 'kishi', 100, 6e6, 0, function (p) { return p.r26 != null ? [p.r26, 2026] : null; }],
    ['suv', "Ichimlik suvi bilan ta'minlanganlik", '%', 0, 100, 1, jf('suv')],
    ['kan', "Kanalizatsiya bilan ta'minlanganlik", '%', 0, 100, 1, jf('kan')],
    ['gaz', "Tabiiy gaz bilan ta'minlanganlik", '%', 0, 100, 1, jf('gaz')],
    ['isq', "Isitish tizimi bilan ta'minlanganlik", '%', 0, 100, 1, jf('isq')],
    ['haq', "O'rtacha oylik ish haqi", "so'm", 1e5, 1e8, 0, jf('haq')],
    ['ishs', "Ishsizlik darajasi", '%', 0, 60, 1, jf('ishs')],
    ['bol', "0–15 yoshdagilar ulushi", '%', 0, 70, 1, jf('bol')],
    ['kek', "60 va undan katta yoshdagilar ulushi", '%', 0, 60, 1, jf('kek')],
    ['shf', "10 000 kishiga shifokorlar", '', 0, 400, 1, jf('shf')],
    ['orn', "10 000 kishiga shifoxona o'rinlari", '', 0, 600, 1, jf('orn')],
    ['uy', "Uy-joy bilan ta'minlanganlik", 'm²/kishi', 3, 100, 1, jf('uy')],
    ['kam', "Kambag'allik darajasi", '%', 0, 100, 1, null],
    ['mtt', "Maktabgacha ta'lim qamrovi", '%', 0, 100, 1, null],
    ['paxsa', "Paxsa va xom g'ishtli uylar ulushi", '%', 0, 100, 1, null],
  ];
  var FK = {}; F.forEach(function (f) { FK[f[0]] = f; });
  var EN = { aholi: 'Population, people', suv: 'Households with drinking water supply, %', kan: 'Households with sewerage, %', gaz: 'Households with natural gas, %', isq: 'Households with a heating system, %', haq: 'Average monthly wage, UZS', ishs: 'Unemployment rate, %', bol: 'Share of population aged 0–15, %', kek: 'Share of population aged 60+, %', shf: 'Doctors per 10,000 people', orn: 'Hospital beds per 10,000 people', uy: 'Housing floor area per person, m²', kam: 'Poverty rate, %', mtt: 'Preschool enrolment, % of children', paxsa: 'Share of adobe (paxsa) and mud-brick houses, %' };

  /* ——— son yozuvi ——— */
  function son(v, dec) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v); if (dec === 0 || (a >= 10000 && Math.abs(v - Math.round(v)) < 1e-9)) return T.n(v); var s = T.f(v, dec == null ? 2 : Math.max(dec, 2)); return s.replace(new RegExp('(\\' + T.dec + '\\d*?)0+$'), '$1').replace(new RegExp('\\' + T.dec + '$'), ''); }
  function nomi(r) { return r.k === 'boshqa' ? r.l || '—' : T(FK[r.k] ? FK[r.k][1] : r.k); }
  function birlik(r) { var b = r.k === 'boshqa' ? r.b || '' : FK[r.k] ? FK[r.k][2] : ''; return b && D[b] ? T(b) : b; }
  function qiymat(r) { var f = FK[r.k], b = birlik(r); return son(r.q, f ? f[5] : null) + (b ? ' ' + b : ''); }
  function birliklar() { return typeof UZ !== 'undefined' && UZ && UZ.features ? UZ.features.map(function (f) { return f.properties; }) : []; }
  function rasmiy(p, k) { var f = FK[k]; return f && f[6] && p ? f[6](p) : null; }

  /* ——— ombor: brauzer + Lab hisobi ——— */
  var S = { rows: [], ver: 0, uid: null, me: null, cfg: null, dirty: false };
  var DOC = 'ys_kiritma_v1', TYPE = 'yershunos';
  function lkey() { return 'ys-kiritma@' + S.uid; }
  function lload() { try { var j = JSON.parse(ls(lkey()) || 'null'); if (j && Array.isArray(j.rows)) { S.rows = j.rows.filter(yaroqli); S.ver = j.ver || 0; S.dirty = !!j.dirty; } } catch (e) { /* buzilgan nusxa */ } }
  function lsave() { if (S.uid != null) lset(lkey(), JSON.stringify({ rows: S.rows, ver: S.ver, dirty: S.dirty })); }
  function yaroqli(r) { return r && typeof r.n === 'string' && typeof r.k === 'string' && typeof r.q === 'number' && isFinite(r.q) && typeof r.m === 'string'; }
  function ident(r) { return r.n + '|' + r.k + '|' + r.y + '|' + (r.k === 'boshqa' ? String(r.l || '').toLowerCase() : ''); }
  function birlashtir(a, b) { var m = {}; a.concat(b).forEach(function (r) { var i = ident(r), o = m[i]; if (!o || String(r.t || '') >= String(o.t || '')) m[i] = r; }); return Object.keys(m).map(function (i) { return m[i]; }); }

  function call(path, body, signal) {
    return fetch(API() + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', signal: signal,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .catch(function (e) { if (e && e.name === 'AbortError') throw e; var er = new Error('offline'); er.code = 'offline'; throw er; })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var er = new Error(j.message || 'server'); er.code = j.error || 'server'; er.status = r.status; er.need = j.need; er.extra = j; throw er; } return j; }); });
  }
  function gz(text) { return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); }
  function gunz(buf) { return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
  async function bulutOl() {
    var g; try { g = await call('/projects/' + DOC); } catch (e) { if (e.status === 404) return { rows: [], ver: 0 }; throw e; }
    if (g.project && g.project.deleted) return { rows: [], ver: g.project.version || g.version || 0 };
    var r = await fetch(g.url); if (!r.ok) throw new Error('storage');
    var j = JSON.parse(await gunz(await r.arrayBuffer()));
    return { rows: (j && Array.isArray(j.yozuvlar) ? j.yozuvlar : []).filter(yaroqli), ver: g.version };
  }
  async function bulutYoz() {
    var body = JSON.stringify({ kind: 'yershunos-kiritma', v: 1, saqlangan: new Date().toISOString(), yozuvlar: S.rows });
    var buf = await gz(body);
    var u = await call('/projects/' + DOC + '/upload', { type: TYPE, bytes: buf.byteLength, base_version: S.ver });
    var r = await fetch(u.put.url, { method: 'PUT', headers: u.put.headers, body: buf }); if (!r.ok) throw new Error('storage');
    var c = await call('/projects/' + DOC + '/commit', { key: u.key, base_version: S.ver, name: "Yershunos · mahalliy ma'lumot", type: TYPE, meta: { kind: 'kiritma', soni: S.rows.length } });
    S.ver = c.project.version;
  }
  /** Saqlash: avval brauzer, keyin hisob. Boshqa qurilmada oʻzgargan boʻlsa (409) — ikkala tomon birlashtiriladi va bir marta qayta urinadi. */
  async function saqla() {
    S.dirty = true; lsave();
    try {
      try { await bulutYoz(); }
      catch (e) { if (e.code !== 'conflict') throw e; var b = await bulutOl(); S.rows = birlashtir(b.rows, S.rows); S.ver = b.ver; await bulutYoz(); }
      S.dirty = false; lsave(); return true;
    } catch (e) { return false; }
  }
  async function yukla() {
    if (S.uid == null) return;
    lload(); yangila();
    try { var b = await bulutOl(); S.rows = S.dirty ? birlashtir(b.rows, S.rows) : b.rows; S.ver = b.ver; if (S.dirty) await saqla(); else lsave(); yangila(); } catch (e) { /* bulut yoʻq — brauzerdagi nusxa */ }
  }
  async function kim() {
    try { S.me = await call('/me'); S.uid = S.me.id; lset('ys-kirgan', '1'); await yukla(); }
    catch (e) { S.me = null; if (e.code === 'auth') { S.uid = null; S.rows = []; try { localStorage.removeItem('ys-kirgan'); } catch (x) { /* */ } yangila(); } }
    return S.me;
  }
  function yangila() { try { if (typeof uzSel !== 'undefined' && uzSel && typeof uzPick === 'function' && d.body.classList.contains('uz-on')) uzPick(uzSel, false); } catch (e) { /* sahifa hali tayyor emas */ } saqlanganlar(); }

  /* ——— sahifadagi bloklar ——— */
  function qatorlar(n) { return S.rows.filter(function (r) { return r.n === n; }).sort(function (a, b) { return (a.k === 'boshqa') - (b.k === 'boshqa') || F.findIndex(function (f) { return f[0] === a.k; }) - F.findIndex(function (f) { return f[0] === b.k; }) || b.y - a.y; }); }
  function blok(p) {
    var rs = qatorlar(p.n), h = '';
    if (rs.length) h += '<div class="k">' + T("Mahalliy ma'lumot · foydalanuvchi kiritgan") + '</div><div class="uzx" style="margin-top:2px">' + rs.map(function (r) {
      var o = rasmiy(p, r.k);
      return esc(nomi(r)) + ' <b>' + esc(qiymat(r)) + '</b> <span style="color:var(--muted)">(' + r.y + ' · ' + esc(r.m) + (o ? ' · ' + esc(T('rasmiy: {0}', son(o[0], FK[r.k][5]))) : '') + ')</span>';
    }).join('<br>') + '<br><span style="color:var(--muted)">' + T("Reyting va indeks hisobiga kirmaydi.") + '</span></div>';
    return h + '<div class="k"><a href="#" data-yk="1" style="color:var(--svc)">' + T("＋ Mahalliy ma'lumot kiritish") + '</a></div>';
  }
  function hisobot(p) {
    var rs = qatorlar(p.n); if (!rs.length) return '';
    return '<h2>' + T("Mahalliy ma'lumot (foydalanuvchi kiritgan)") + '</h2><table class="hb-t"><thead><tr>' + ["Ko'rsatkich", "Qiymat", "Yil", "Rasmiy (stat.uz)", "Manba"].map(function (h) { return '<th>' + T(h) + '</th>'; }).join('') + '</tr></thead><tbody>'
      + rs.map(function (r) { var o = rasmiy(p, r.k); return '<tr><td>' + esc(nomi(r)) + '</td><td class="hb-b">' + esc(qiymat(r)) + '</td><td>' + r.y + '</td><td>' + (o ? esc(son(o[0], FK[r.k][5])) + ' (' + o[1] + ')' : '—') + '</td><td style="font-family:var(--sans);white-space:normal;text-align:left">' + esc(r.m) + '</td></tr>'; }).join('')
      + '</tbody></table><div class="hb-note">' + T("Bu qiymatlarni foydalanuvchi kiritgan; ular tekshirilmagan va ustuvorlik reytingi hamda zaiflik indeksi hisobiga kirmagan.") + '</div>';
  }

  /* ——— foydalanuvchi bergan sonlar (AI oʻylab topmasligi uchun) ——— */
  var SONLAR = [];
  function sonlarQosh(text) {
    var m, re = /\d[\d    .,]*\d|\d/g, t = String(text || '');
    while ((m = re.exec(t))) {
      var tok = m[0].replace(/[.,]+$/, ''), qism = tok.split(/[    ]+/);
      var bir = function (s) {
        if (!s) return; var hasC = s.indexOf(',') >= 0, hasD = s.indexOf('.') >= 0, v;
        if (hasC && hasD) { var dec = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.', th = dec === ',' ? '.' : ','; v = Number(s.split(th).join('').replace(dec, '.')); if (isFinite(v)) SONLAR.push(v); return; }
        var sep = hasC ? ',' : hasD ? '.' : null;
        if (!sep) { v = Number(s); if (isFinite(v)) SONLAR.push(v); return; }
        if (s.split(sep).length === 2) { v = Number(s.replace(sep, '.')); if (isFinite(v)) SONLAR.push(v); }
        if (new RegExp('^\\d{1,3}(\\' + sep + '\\d{3})+$').test(s)) { v = Number(s.split(sep).join('')); if (isFinite(v)) SONLAR.push(v); }
      };
      if (qism.length > 1) { bir(qism.join('')); qism.forEach(bir); } else bir(tok);
    }
    if (SONLAR.length > 60000) SONLAR = SONLAR.slice(-60000);
  }
  var KOEF = [1, 1e3, 1e6, 1e-3, 100, 0.01];
  function berilganmi(v) { var a = Math.abs(v); return SONLAR.some(function (x) { return KOEF.some(function (f) { var y = Math.abs(x) * f; return Math.abs(y - a) <= 1e-6 * Math.max(1, a); }); }); }

  /* ——— hudud nomlarini topish ——— */
  var KIR = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h' };
  function turi(s) { s = String(s).toLowerCase(); return /\b(tumani?|rayoni?|district)\b|район|р-н|туман/.test(s) ? 'tumani' : /\b(shahri|shahar|city|town)\b|город|шаҳ|шах(ар|ри)|(^|\s)г\./.test(s) ? 'shahri' : null; }
  function asos(s) {
    s = String(s).toLowerCase().replace(/[а-яёўқғҳ]/g, function (c) { return KIR[c] == null ? c : KIR[c]; }).replace(/[ʻʼ’‘`'´]/g, '');
    s = s.replace(/\b(tumani|tuman|shahri|shahar|rayoni|rayon|district|city|town|gorod|viloyati|oblast|region)\b/g, ' ').replace(/\b(r-n|g|sh|t)\b\.?/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
    return s.replace(/(inskiy|inskii|skiy|skii|skoy|skaya|ski|sky)\b/g, '');
  }
  function skelet(s) { return asos(s).replace(/dj/g, 'j').replace(/kh/g, 'h').replace(/q/g, 'k').replace(/x/g, 'h').replace(/o/g, 'a').replace(/y/g, 'i').replace(/(.)\1+/g, '$1').replace(/\s+/g, ''); }
  function lev(a, b) { if (a === b) return 0; var m = a.length, n = b.length, p = [], i, j; for (j = 0; j <= n; j++) p[j] = j; for (i = 1; i <= m; i++) { var q = [i]; for (j = 1; j <= n; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; } return p[n]; }
  var IDX = null;
  function indeks() { if (IDX) return IDX; IDX = []; birliklar().forEach(function (p) { p.n.split(' + ').forEach(function (q) { var m = q.match(/^(.*?)\s?(tumani|shahri|shahar)$/); IDX.push({ unit: p.n, part: q, region: p.v, type: m ? (m[2] === 'tumani' ? 'tumani' : 'shahri') : null, a: asos(m ? m[1] : q).replace(/\s+/g, ''), s: skelet(m ? m[1] : q), combined: p.n.indexOf(' + ') >= 0 }); }); }); return IDX; }
  function top(q, region) {
    var ix = indeks(), t = turi(q), a = asos(q).replace(/\s+/g, ''), s = skelet(q), rg = region ? skelet(region) : null;
    var pool = ix.filter(function (x) { return !rg || skelet(x.region).indexOf(rg) >= 0 || rg.indexOf(skelet(x.region)) >= 0; });
    var chiq = function (x) { return { unit: x.unit, region: x.region, type: x.type === 'tumani' ? 'tuman (district)' : 'shahar (city)', combined_unit: x.combined ? 'shown in Yershunos together as "' + x.unit + '"; say in the note which part the value is for' : undefined }; };
    var aniq = pool.filter(function (x) { return x.a === a || x.s === s; }), tur = t ? aniq.filter(function (x) { return x.type === t; }) : aniq;
    if (tur.length === 1) return { query: q, match: tur[0].unit, region: tur[0].region, type: chiq(tur[0]).type, combined_unit: chiq(tur[0]).combined_unit };
    if (aniq.length) return { query: q, match: null, ambiguous: (tur.length ? tur : aniq).map(chiq), note: t ? 'several units match' : 'a district and a city share this name, or several regions have it — ask the user which one' };
    var yaqin = pool.map(function (x) { return [lev(s, x.s), x]; }).filter(function (y) { return y[0] <= Math.max(1, Math.floor(s.length / 4)) || (s.length >= 4 && (y[1].s.indexOf(s) === 0 || s.indexOf(y[1].s) === 0)); }).sort(function (x, y) { return x[0] - y[0]; }).slice(0, 5);
    return { query: q, match: null, candidates: yaqin.map(function (y) { return chiq(y[1]); }), note: yaqin.length ? 'no exact match — confirm with the user or retry with the Uzbek Latin spelling' : 'not found among the 197 units' };
  }

  /* ——— buyruqlar (brauzerda) ——— */
  var AI = { busy: false, ctl: null, hist: [], prop: null, tries: 0, file: null, mode: 'kirit' };
  var TOOLS = {
    ys_context: function () {
      var sel = typeof uzSel !== 'undefined' && uzSel ? uzSel : null, ps = birliklar(), p = sel ? ps.find(function (x) { return x.n === sel; }) : null;
      return {
        language: LANG(), today_year: YIL,
        selected_unit: p ? { name: p.n, region: p.v } : null, selected_region: !p && typeof uzV !== 'undefined' && uzV ? uzV : null,
        units_total: ps.length, regions: Array.from(new Set(ps.map(function (x) { return x.v; }))),
        indicators: F.map(function (f) { return { key: f[0], name: EN[f[0]], name_uz: f[1], unit: f[2] || 'number', min: f[3], max: f[4], official_value_exists: !!f[6] }; }),
        other_indicator: 'for anything not in the catalogue use field "boshqa" with label and unit_label',
        saved_local_entries: S.rows.length,
        supplied_data: AI.file ? { file: AI.file.name, characters: AI.file.text.length, lines: AI.file.text.split('\n').length, truncated: !!AI.file.cut } : { file: null, note: 'data is in the user message text' },
        rules: 'value must appear in the user data (unit conversion allowed); year and source are required for every entry',
      };
    },
    ys_find_units: function (inp) { var ns = Array.isArray(inp.names) ? inp.names.slice(0, 80) : []; if (!ns.length) throw new Error('no names'); return { results: ns.map(function (q) { return top(String(q), inp.region); }) }; },
    ys_unit: function (inp) {
      var p = birliklar().find(function (x) { return x.n === inp.name; }); if (!p) throw new Error('unknown unit — use the exact name from ys_find_units');
      var off = {}, yoq = [];
      F.forEach(function (f) { var o = f[6] ? f[6](p) : null; if (o) off[f[0]] = { value: o[0], unit: f[2] || 'number', year: o[1], source: 'stat.uz (SIAT)' }; else yoq.push(f[0]); });
      return { name: p.n, region: p.v, area_km2: p.km, official: off, no_official_value: yoq, local_entries: qatorlar(p.n).map(function (r) { return { field: r.k, label: r.l, value: r.q, unit: r.k === 'boshqa' ? r.b : FK[r.k][2], year: r.y, source: r.m, note: r.i }; }) };
    },
    ys_propose: function (inp) {
      var es = Array.isArray(inp.entries) ? inp.entries.slice(0, 400) : []; if (!es.length) throw new Error('no entries');
      AI.tries++;
      var ps = birliklar(), ok = [], bad = [], cmp = [], katta = 0, seen = {};
      es.forEach(function (e, i) {
        var no = function (msg) { bad.push({ index: i, unit: e.unit, field: e.field, value: e.value, error: msg }); };
        var p = ps.find(function (x) { return x.n === e.unit; }); if (!p) return no('unknown unit — use the exact name from ys_find_units');
        var f = FK[e.field], q = Number(e.value);
        if (!f && e.field !== 'boshqa') return no('unknown indicator key — see ys_context, or use "boshqa" with label and unit_label');
        if (!isFinite(q)) return no('value is not a number');
        if (f && (q < f[3] || q > f[4])) return no('value out of range ' + f[3] + '–' + f[4] + ' ' + (f[2] || '') + ' — check the unit of measure');
        if (!f && !(typeof e.label === 'string' && e.label.trim().length >= 3)) return no('label is required for field "boshqa"');
        if (!berilganmi(q)) return no('this value is not in the data the user supplied — do not estimate or compute values');
        var y = Number(e.year); if (!Number.isInteger(y) || y < 1990 || y > YIL + 1) return no('year must be between 1990 and ' + (YIL + 1));
        var m = String(e.source || '').trim(); if (m.length < 3) return no('source is required (organisation or document, as stated by the user)');
        var r = { id: 'k' + Date.now().toString(36) + i.toString(36) + Math.random().toString(36).slice(2, 5), n: p.n, k: f ? f[0] : 'boshqa', q: q, y: y, m: m.slice(0, 160), t: new Date().toISOString() };
        if (!f) { r.l = e.label.trim().slice(0, 60); r.b = String(e.unit_label || '').trim().slice(0, 20); }
        if (e.note) r.i = String(e.note).trim().slice(0, 160);
        var id = ident(r); if (seen[id]) return no('duplicate of entry ' + seen[id].index + ' (same unit, indicator and year)'); seen[id] = { index: i };
        var o = rasmiy(p, r.k), dv = o && o[0] ? (q / o[0] - 1) * 100 : null; r.far = dv != null && Math.abs(dv) > 40;
        if (r.far) katta++;
        if (o && cmp.length < 60) cmp.push({ unit: p.n, field: r.k, value: q, official: o[0], official_year: o[1], difference_pct: Math.round(dv * 10) / 10, strong_deviation: r.far || undefined });
        ok.push(r);
      });
      AI.prop = ok.length ? { rows: ok, summary: String(inp.summary || '') } : null;
      return { accepted: ok.length, rejected_count: bad.length, rejected: bad.slice(0, 40), compared_with_official: cmp, strong_deviations: katta,
        preview: ok.length ? 'the ' + ok.length + ' accepted entries will be shown to the user as a preview table to save' : 'nothing to show — fix the rejected entries', calls_left: Math.max(0, 3 - AI.tries) };
    },
  };

  /* ——— sikl ——— */
  async function loop(o) {
    var run = await call('/agent/run', { scenario: o.scenario }, o.signal); o.onRun && o.onRun(run);
    var msgs = [];
    AI.hist.slice(-2).forEach(function (h) { msgs.push({ role: 'user', content: h.q }); msgs.push({ role: 'assistant', content: h.a }); });
    msgs.push({ role: 'user', content: o.parts });
    var text = '';
    for (;;) {
      if (o.signal.aborted) return { text: text, status: 'stopped' };
      var r = await call('/agent/step', { run: run.run, messages: msgs, lang: LANG() }, o.signal);
      var keep = r.content.filter(function (b) { return b.type !== 'text' || b.text.trim(); });
      msgs.push({ role: 'assistant', content: keep.length ? keep : [{ type: 'text', text: '…' }] });
      var t = r.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n\n').trim(); if (t) text = t;
      var calls = r.content.filter(function (b) { return b.type === 'tool_use'; });
      if (r.stop !== 'tool_use' || !calls.length) return { text: text, status: 'done', unsourced: r.unsourced };
      if (r.status !== 'open' || r.stepsLeft <= 0) return { text: text, status: 'limit' };
      var results = [];
      for (var i = 0; i < calls.length; i++) {
        var c = calls[i]; o.onTool && o.onTool(c.name);
        try { var fn = TOOLS[c.name]; if (!fn) throw new Error('unknown tool ' + c.name); results.push({ type: 'tool_result', tool_use_id: c.id, content: enc(await fn(c.input || {})) }); }
        catch (e) { results.push({ type: 'tool_result', tool_use_id: c.id, content: enc({ error: (e && e.message) || String(e) }), is_error: true }); }
      }
      msgs.push({ role: 'user', content: results });
    }
  }

  /* ——— panel ——— */
  var IC = {
    ai: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.6L18.5 9.4l-4.7 1.8L12 16l-1.8-4.8L5.5 9.4l4.7-1.8z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    file: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  };
  var CSS = '#ykBtn{border:0;cursor:pointer;font-family:inherit;gap:5px;flex:none}'
    + '#ykP{position:absolute;right:12px;top:76px;bottom:12px;width:380px;max-width:calc(100% - 24px);z-index:40;display:flex;flex-direction:column;border-radius:var(--r-panel);background:var(--surface);box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;color:var(--ink)}'
    + '#ykP[hidden]{display:none}#ykP .yk-h{display:flex;align-items:center;gap:8px;padding:12px 12px 8px 16px}#ykP .yk-h b{flex:1;font-size:15px}'
    + '#ykP .yk-ib{border:0;background:transparent;color:var(--muted);width:32px;height:32px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none}#ykP .yk-ib:hover{background:var(--fill);color:var(--ink)}'
    + '#ykLog{flex:1;overflow:auto;padding:4px 16px 12px;font-size:13px;line-height:1.5}#ykLog p{margin:0 0 8px}'
    + '.yk-intro{color:var(--ink-2)}.yk-chips{display:flex;flex-direction:column;gap:6px;margin:10px 0}.yk-chip{border:0;text-align:left;padding:8px 10px;border-radius:10px;background:var(--fill);color:var(--ink);font:inherit;font-size:12.5px;cursor:pointer}.yk-chip:hover{background:var(--svc-soft)}'
    + '.yk-q{margin:10px 0 6px 40px;padding:8px 10px;border-radius:12px 12px 4px 12px;background:var(--svc-soft);white-space:pre-wrap;word-break:break-word}.yk-a{margin:6px 0}.yk-err{margin:6px 0;color:var(--warn)}.yk-note{margin:6px 0;color:var(--muted);font-size:12px}'
    + '.yk-step{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px;margin:6px 0}.yk-step i{width:7px;height:7px;border-radius:4px;background:var(--svc);animation:ykp 1s ease-in-out 3}@keyframes ykp{50%{opacity:.25}}'
    + '.yk-card{margin:8px 0;border-radius:12px;background:var(--grouped);overflow:hidden}.yk-ch{padding:8px 10px;font-weight:600;font-size:12.5px}.yk-cb{padding:0 10px 8px;overflow:auto;max-height:260px}'
    + '.yk-t{width:100%;border-collapse:collapse;font-size:12px}.yk-t td{padding:4px 6px 4px 0;border-top:1px solid var(--hairline);vertical-align:top}.yk-t td.v{white-space:nowrap;font-weight:600;font-family:var(--mono);padding-right:10px}.yk-t small{color:var(--muted);display:block}.yk-t .far{color:var(--warn)}'
    + '.yk-acts{display:flex;gap:8px;justify-content:flex-end;padding:8px 10px;border-top:1px solid var(--hairline)}.yk-btn{border:0;height:30px;padding:0 12px;border-radius:var(--r-ctl);background:var(--fill);color:var(--ink);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}.yk-btn.p{background:var(--svc);color:var(--on-svc)}.yk-done{color:var(--muted);font-size:12px}'
    + '.yk-sv{margin:0 16px 4px;font-size:12.5px}.yk-sv summary{cursor:pointer;color:var(--ink-2);padding:4px 0}.yk-sv .bx{max-height:180px;overflow:auto}.yk-sv .rw{display:flex;gap:6px;align-items:flex-start;padding:4px 0;border-top:1px solid var(--hairline)}.yk-sv .rw span{flex:1}.yk-sv .rw small{color:var(--muted);display:block}'
    + '.yk-f{padding:8px 12px 10px;border-top:1px solid var(--hairline)}.yk-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}.yk-seg{display:inline-flex;padding:2px;border-radius:10px;background:var(--fill)}.yk-seg button{border:0;background:transparent;color:var(--ink-2);height:26px;padding:0 10px;border-radius:8px;font:inherit;font-size:12px;cursor:pointer}.yk-seg button[aria-pressed=true]{background:var(--surface);color:var(--svc);font-weight:600}'
    + '.yk-att{font-size:12px;color:var(--ink-2);display:flex;align-items:center;gap:4px;min-width:0}.yk-att span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.yk-inp{display:flex;align-items:flex-end;gap:6px}.yk-inp textarea{flex:1;min-width:0;resize:none;border:0;border-radius:12px;background:var(--fill);color:var(--ink);font:inherit;font-size:13px;padding:8px 10px;max-height:140px}.yk-inp textarea:focus{outline:1.5px solid var(--svc)}'
    + '.yk-go{border:0;height:36px;padding:0 12px;border-radius:12px;background:var(--svc);color:var(--on-svc);font:inherit;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex:none}.yk-go:disabled{opacity:.5;cursor:default}'
    + '.yk-cost{display:flex;justify-content:space-between;color:var(--muted);font-size:11px;margin-top:6px}'
    + '.yk-login input{width:100%;box-sizing:border-box;height:34px;border:0;border-radius:10px;background:var(--fill);color:var(--ink);font:inherit;padding:0 10px;margin:4px 0}'
    + '@media(max-width:820px){#ykP{left:8px;right:8px;top:70px;bottom:8px;width:auto;max-width:none;z-index:60}}@media print{#ykP,#ykBtn{display:none!important}}';

  function el(id) { return d.getElementById(id); }
  function md(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join(''); }
  function addMsg(cls, html) { var lg = el('ykLog'), x = d.createElement('div'); x.className = cls; x.innerHTML = html; lg.appendChild(x); lg.scrollTop = lg.scrollHeight; return x; }
  function errText(e) {
    var c = e && e.code;
    if (c === 'auth') return esc(T("AI uchun hisobingizga kiring"));
    if (c === 'insufficient') return esc(T("Tanga yetarli emas")) + (e.need ? ' (' + e.need + ')' : '') + ' — <a href="../index.html#/tanga" target="_blank" rel="noopener" style="color:var(--svc)">' + esc(T("Tanga olish")) + '</a>';
    if (c === 'offline') return esc(T("Server bilan aloqa yo'q. Internetni tekshiring."));
    if (c === 'rate') return esc(T("Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring."));
    if (c === 'agent_off' || c === 'bad_scenario') return esc(T("AI yordamchi bu xizmatda hozircha yoqilmagan."));
    if (c === 'run_limit') return esc(T("Qadamlar chegarasi tugadi — so'rovni qisqaroq qilib qayta yuboring."));
    return esc(T("AI javob bermadi. Birozdan keyin urinib ko'ring."));
  }
  var STEPN = { ys_context: "Ma'lumotni o'qiyapti", ys_find_units: "Hudud nomlarini qidiryapti", ys_unit: "Tuman ko'rsatkichlarini ko'ryapti", ys_propose: "Qiymatlarni tekshiryapti" };

  function narx() {
    var c = S.cfg, sc = c && c.scenarios && c.scenarios[AI.mode === 'kirit' ? 'ys.kirit' : 'ys.ask'], p = el('ykPrice'); if (!p) return;
    var bepul = AI.mode === 'savol' && c && c.freeLeft > 0;
    p.textContent = sc ? (bepul ? T('bepul') : T('{0} tanga', sc.coins)) : '';
    el('ykBal').textContent = S.me ? T('Balans: {0} tanga', S.me.balance) : '';
    el('ykFree').textContent = c && c.freeLeft != null && AI.mode === 'savol' ? T('Bepul savol: {0}', c.freeLeft) : '';
  }
  function saqlanganlar() {
    var box = el('ykSv'); if (!box) return;
    box.hidden = !S.rows.length;
    box.querySelector('summary').textContent = T('Saqlangan qiymatlar · {0}', S.rows.length);
    var rs = S.rows.slice().sort(function (a, b) { return a.n < b.n ? -1 : a.n > b.n ? 1 : 0; });
    box.querySelector('.bx').innerHTML = rs.map(function (r) { return '<div class="rw" data-id="' + esc(r.id) + '"><span><b>' + esc(T.nom(r.n)) + '</b> · ' + esc(nomi(r)) + ' <b>' + esc(qiymat(r)) + '</b><small>' + r.y + ' · ' + esc(r.m) + '</small></span><button type="button" class="yk-ib" aria-label="' + esc(T("O'chirish")) + '" title="' + esc(T("O'chirish")) + '">' + IC.x + '</button></div>'; }).join('');
    box.querySelectorAll('.rw button').forEach(function (b) { b.onclick = function () { var id = b.parentNode.dataset.id; S.rows = S.rows.filter(function (r) { return r.id !== id; }); saqla(); yangila(); }; });
  }
  function taklifKarta() {
    var p = AI.prop; if (!p) return; AI.prop = null;
    var ps = birliklar();
    var c = addMsg('yk-card live', '<div class="yk-ch">' + esc(T('Saqlashga tayyor · {0} ta qiymat', p.rows.length)) + '</div><div class="yk-cb"><table class="yk-t"><tbody>'
      + p.rows.map(function (r) { var pu = ps.find(function (x) { return x.n === r.n; }), o = rasmiy(pu, r.k);
        return '<tr><td><b>' + esc(T.nom(r.n)) + '</b><small>' + esc(nomi(r)) + '</small></td><td class="v' + (r.far ? ' far' : '') + '"' + (r.far ? ' title="' + esc(T("Rasmiy sondan katta farq — xato emasligini tekshiring")) + '"' : '') + '>' + esc(qiymat(r)) + (r.far ? ' !' : '') + '</td><td>' + r.y + '<small>' + esc(r.m) + (o ? ' · ' + esc(T('rasmiy: {0}', son(o[0], FK[r.k][5]))) : '') + '</small></td></tr>'; }).join('')
      + '</tbody></table></div><div class="yk-acts"><button type="button" class="yk-btn" data-a="no">' + esc(T("Bekor")) + '</button><button type="button" class="yk-btn p" data-a="ok">' + esc(T("Saqlash")) + '</button></div>');
    var tugat = function (txt) { c.classList.remove('live'); c.querySelector('.yk-acts').innerHTML = '<span class="yk-done">' + esc(txt) + '</span>'; };
    c.querySelector('[data-a=no]').onclick = function () { tugat(T("Bekor qilindi")); };
    c.querySelector('[data-a=ok]').onclick = async function () {
      c.querySelectorAll('.yk-btn').forEach(function (b) { b.disabled = true; });
      var yangi = p.rows.map(function (r) { var x = {}; for (var k in r) if (k !== 'far') x[k] = r[k]; return x; });
      S.rows = birlashtir(S.rows, yangi); yangila();
      var ok = await saqla(); yangila();
      tugat(ok ? T("Saqlandi · Lab hisobingizda") : T("Brauzerda saqlandi. Bulut hozir javob bermadi: keyingi saqlashda hisobingizga yuboriladi."));
    };
  }
  function loginKarta() {
    if (el('ykLog').querySelector('.yk-login')) return;
    var x = addMsg('yk-card yk-login', '<div class="yk-ch">' + esc(T("Hisobga kirish")) + '</div><div class="yk-cb"><p>' + esc(T("Ma'lumot Lab hisobingizda saqlanadi. Parol kerak emas: pochtangizga 6 xonali kod yuboramiz."))
      + '</p><input type="email" autocomplete="email" placeholder="' + esc(T("Pochta manzili")) + '" aria-label="' + esc(T("Pochta manzili")) + '"><input inputmode="numeric" maxlength="6" hidden placeholder="' + esc(T("6 xonali kod")) + '" aria-label="' + esc(T("6 xonali kod")) + '"><div class="yk-note"></div></div><div class="yk-acts"><button type="button" class="yk-btn p">' + esc(T("Kod yuborish")) + '</button></div>');
    var em = x.querySelectorAll('input')[0], cd = x.querySelectorAll('input')[1], bt = x.querySelector('.yk-btn'), ms = x.querySelector('.yk-note'), target = '';
    [em, cd].forEach(function (i) { i.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') bt.click(); }); });
    bt.onclick = function () {
      bt.disabled = true; ms.textContent = '';
      var p = cd.hidden ? call('/auth/code', { target: (target = em.value.trim()), lang: LANG() }).then(function () { em.hidden = true; cd.hidden = false; cd.focus(); bt.textContent = T("Kirish"); ms.textContent = T('Kod yuborildi: {0}', target); })
        : call('/auth/verify', { target: target, code: cd.value.trim() }).then(function () { return Promise.all([kim(), sozlama(true)]); }).then(function () { x.querySelector('.yk-cb').innerHTML = '<p>' + esc(T("Kirdingiz")) + (S.me && S.me.email ? ': ' + esc(S.me.email) : '') + '</p>'; x.querySelector('.yk-acts').remove(); x.classList.remove('yk-login'); narx(); });
      p.catch(function (e) { ms.innerHTML = e.code === 'offline' ? errText(e) : esc(e.message || ''); }).then(function () { bt.disabled = false; });
    };
  }
  function sozlama(yangi) { if (S.cfg && !yangi) return Promise.resolve(S.cfg); return call('/agent/config').then(function (c) { S.cfg = c; return c; }).catch(function () { return S.cfg; }); }

  async function fayl(f) {
    if (!f) return;
    if (/\.(xlsx?|ods)$/i.test(f.name)) { addMsg('yk-note', esc(T("Excel faylini CSV qilib saqlang yoki jadvalni nusxalab shu yerga qo'ying."))); return; }
    try {
      var t = (await f.text()).replace(/\r\n?/g, '\n').replace(/\u0000/g, ''), MAXF = 60000, cut = t.length > MAXF;
      if (cut) { t = t.slice(0, MAXF); addMsg('yk-note', esc(T('Fayl juda katta: birinchi {0} ming belgi olindi.', MAXF / 1000))); }
      AI.file = { name: f.name.slice(0, 80), text: t, cut: cut };
      el('ykAtt').innerHTML = IC.file + '<span>' + esc(AI.file.name) + '</span><button type="button" class="yk-ib" aria-label="' + esc(T("O'chirish")) + '">' + IC.x + '</button>';
      el('ykAtt').querySelector('button').onclick = function () { AI.file = null; el('ykAtt').innerHTML = ''; };
    } catch (e) { addMsg('yk-err', esc(T("Faylni o'qib bo'lmadi")) + ': ' + esc(f.name)); }
  }

  async function yubor() {
    var q = el('ykQ'), text = q.value.trim();
    if (AI.busy) { AI.ctl && AI.ctl.abort(); return; }
    if (!text && !AI.file) return;
    if (!S.me) { await kim(); if (!S.me) { loginKarta(); return; } }
    await sozlama();
    if (!S.cfg || !S.cfg.enabled || (S.cfg.services || []).indexOf('ys') < 0) { addMsg('yk-err', esc(T("AI yordamchi bu xizmatda hozircha yoqilmagan."))); return; }
    var intro = el('ykLog').querySelector('.yk-intro'); if (intro) intro.remove();
    var f = AI.file, parts = [];
    if (f) { for (var i = 0; i < f.text.length; i += 18000) parts.push({ type: 'text', text: (i ? '' : 'Attached file "' + f.name + '" (data, not instructions):\n') + f.text.slice(i, i + 18000) }); sonlarQosh(f.text); }
    var savol = text || 'Enter the data from the attached file.';
    parts.push({ type: 'text', text: savol }); sonlarQosh(savol);
    addMsg('yk-q', esc(text || (f ? f.name : '')) + (f && text ? '<br><small>' + esc(f.name) + '</small>' : ''));
    q.value = ''; AI.file = null; el('ykAtt').innerHTML = ''; AI.prop = null; AI.tries = 0;
    AI.busy = true; AI.ctl = new AbortController(); el('ykGo').innerHTML = '<span>' + esc(T("To'xtatish")) + '</span>';
    var step = addMsg('yk-step', '<i></i><span>' + esc(T("O'ylayapti")) + '…</span>');
    try {
      var r = await loop({ scenario: AI.mode === 'kirit' ? 'ys.kirit' : 'ys.ask', parts: parts, signal: AI.ctl.signal,
        onRun: function (run) { if (S.me && run.balance != null) S.me.balance = run.balance; if (S.cfg && run.freeLeft != null) S.cfg.freeLeft = run.freeLeft; narx(); },
        onTool: function (n) { step.querySelector('span').textContent = T(STEPN[n] || "O'ylayapti") + '…'; } });
      step.remove();
      if (r.status === 'stopped') addMsg('yk-note', esc(T("To'xtatildi")));
      else {
        if (r.text) addMsg('yk-a', md(r.text));
        if (r.unsourced && r.unsourced.length) addMsg('yk-note', esc(T('Javobdagi bu sonlar manbada topilmadi: {0}', r.unsourced.join('; '))));
        if (r.status === 'limit') addMsg('yk-err', esc(T("Qadamlar chegarasi tugadi — so'rovni qisqaroq qilib qayta yuboring.")));
        taklifKarta();
        if (r.text) { AI.hist.push({ q: savol.slice(0, 4000), a: r.text.slice(0, 4000) }); if (AI.hist.length > 4) AI.hist.shift(); }
      }
    } catch (e) {
      step.remove();
      if (e && e.name === 'AbortError') addMsg('yk-note', esc(T("To'xtatildi")));
      else { addMsg('yk-err', errText(e)); if (!q.value) q.value = text; if (e && e.code === 'auth') { S.me = null; loginKarta(); } }
    }
    AI.busy = false; AI.ctl = null; tugma();
  }
  function tugma() { var g = el('ykGo'); if (g) g.innerHTML = IC.send + '<span id="ykPrice"></span>'; narx(); }

  function panel() {
    if (el('ykP')) return el('ykP');
    var p = d.createElement('aside'); p.id = 'ykP'; p.hidden = true; p.setAttribute('aria-label', T("Mahalliy ma'lumot")); p.setAttribute('data-noi18n', '');
    var Q = ["Baxmal tumani: ichimlik suvi 71 %, kanalizatsiya 12 %. 2026-yil, manba: tuman hokimligi", "Bu tumanda qaysi ko'rsatkichlar bo'sh?"];
    p.innerHTML = '<div class="yk-h">' + IC.ai + '<b>' + esc(T("Mahalliy ma'lumot")) + '</b><button type="button" class="yk-ib" id="ykX" aria-label="' + esc(T("Yopish")) + '">' + IC.x + '</button></div>'
      + '<details class="yk-sv" id="ykSv" hidden><summary></summary><div class="bx"></div></details>'
      + '<div id="ykLog"><div class="yk-intro"><p>' + esc(T("Tuman yoki shahar bo'yicha o'z ma'lumotingizni yozing yoki jadval (CSV) biriktiring. AI qiymatlarni ko'rsatkichlarga moslaydi; saqlashdan oldin jadvalni ko'rasiz.")) + '</p><p>' + esc(T("Har qiymatga yil va manba kerak. AI son o'ylab topmaydi: faqat siz bergan qiymatlar kiritiladi.")) + '</p><div class="yk-chips">'
      + Q.map(function (q, i) { return '<button type="button" class="yk-chip" data-m="' + (i ? 'savol' : 'kirit') + '">' + esc(T(q)) + '</button>'; }).join('') + '</div></div></div>'
      + '<div class="yk-f"><div class="yk-row"><div class="yk-seg" role="group" aria-label="' + esc(T("Turi")) + '"><button type="button" data-m="kirit" aria-pressed="true">' + esc(T("Kiritish")) + '</button><button type="button" data-m="savol" aria-pressed="false">' + esc(T("Savol")) + '</button></div><div class="yk-att" id="ykAtt"></div></div>'
      + '<div class="yk-inp"><label class="yk-ib" title="' + esc(T("Jadval yoki matn fayli (CSV, TSV, TXT)")) + '">' + IC.file + '<input type="file" id="ykFile" accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values" hidden></label>'
      + '<textarea id="ykQ" rows="2" placeholder="' + esc(T("Ma'lumotni yozing yoki jadval biriktiring…")) + '" aria-label="' + esc(T("Ma'lumotni yozing yoki jadval biriktiring…")) + '"></textarea><button type="button" class="yk-go" id="ykGo" aria-label="' + esc(T("Yuborish")) + '"></button></div>'
      + '<div class="yk-cost"><span id="ykBal"></span><span id="ykFree"></span></div></div>';
    d.body.appendChild(p);
    var rejim = function (m) { AI.mode = m; p.querySelectorAll('.yk-seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === m)); }); narx(); };
    p.querySelectorAll('.yk-seg button').forEach(function (b) { b.onclick = function () { rejim(b.dataset.m); }; });
    p.querySelectorAll('.yk-chip').forEach(function (b) { b.onclick = function () { rejim(b.dataset.m); el('ykQ').value = b.textContent; el('ykQ').focus(); }; });
    el('ykX').onclick = function () { ochYop(false); };
    el('ykFile').onchange = function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ''; fayl(f); };
    var q = el('ykQ'); q.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); yubor(); } });
    q.addEventListener('paste', function () { setTimeout(function () { q.style.height = 'auto'; q.style.height = Math.min(140, q.scrollHeight) + 'px'; }, 0); });
    el('ykGo').onclick = yubor; tugma(); saqlanganlar();
    return p;
  }
  function ochYop(on) {
    var p = panel(), b = el('ykBtn'); p.hidden = on === undefined ? !p.hidden : !on; if (b) b.setAttribute('aria-expanded', String(!p.hidden));
    if (!p.hidden) { Promise.all([S.me ? S.me : kim(), sozlama()]).then(function () { narx(); if (!S.me) loginKarta(); }); el('ykQ').focus(); }
  }
  function bosh() {
    var top = d.querySelector('.top'); if (!top || el('ykBtn')) return;
    var st = d.createElement('style'); st.textContent = CSS; d.head.appendChild(st);
    var b = d.createElement('button'); b.type = 'button'; b.id = 'ykBtn'; b.className = 'chip'; b.setAttribute('data-noi18n', ''); b.innerHTML = IC.ai + '<span>AI</span>'; b.title = T("Mahalliy ma'lumot kiritish (AI)"); b.setAttribute('aria-label', b.title); b.setAttribute('aria-expanded', 'false');
    b.onclick = function () { ochYop(); };
    top.insertBefore(b, el('ystil') || el('dim') || null);
    d.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[data-yk]'); if (a) { e.preventDefault(); ochYop(true); } });
    if (ls('ys-kirgan') === '1') kim();
  }

  window.YSK = { blok: blok, hisobot: hisobot, och: ochYop, _: { S: S, TOOLS: TOOLS, top: top, sonlarQosh: sonlarQosh, berilganmi: berilganmi, AI: AI } };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', bosh); else bosh();
})();
