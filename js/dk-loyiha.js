/*
 * Dizayn-kod: har peshlavha — alohida loyiha (23.11.2026, egasi: «ha, har bir peshlavha alohida loyiha»).
 * - ?p= yoʻq — sahifa ishlamaydi, avval Dizayn-kod loyihalari paneli (yangi / mavjud); ?asosiy=1 — eski namuna rejimi (testlar).
 * - ?p=s_… — Dizayn-kod loyihasi (roʻyxat `svcp:dk`, Loyihalarim da ham koʻrinadi); ?p=p_… — Master reja loyihasi ichidagi peshlavha.
 * - Holat IndexedDB da (`archemistry-dk` / st / <id>): S maydonlari + fasad rasmi (JPEG) + logotiplar; karta rasmi `svcthumb@<id>`.
 * dizaynkod.html ichki skripti `boot` da window.dkBoot() ni chaqiradi (true — namuna ochilmaydi).
 */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), PID = Q.get('p'), LEGACY = Q.get('asosiy') === '1';
  var T = function (t) { return window.kpsT ? window.kpsT(t) : t; };
  var KEEP = ['tip', 'meros', 'visorPass', 'step', 'door', 'sub3', 'show2', 'night', 'snap', 'lines', 'bezak', 'windows', 'signs', 'sel', 'nextId', 'newType', 'tipFromMap'];
  var REG = 'svcp:dk';

  /* ---------- roʻyxat (svcp:dk — app/storage/svcprojects bilan bir xil shakl) ---------- */
  function list() { try { var a = JSON.parse(localStorage.getItem(REG) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && typeof x.id === 'string'; }) : []; } catch (e) { return []; } }
  function saveList(a) { try { localStorage.setItem(REG, JSON.stringify(a)); } catch (e) { /* */ } }
  function create(name) {
    var t = new Date().toISOString(), p = { id: 's_' + Math.random().toString(36).slice(2, 12), name: String(name).slice(0, 120), created: t, updated: t };
    saveList([p].concat(list())); return p;
  }
  function touch(id, name) {
    var a = list(), p = a.find(function (x) { return x.id === id; }); if (!p) return;
    p.updated = new Date().toISOString(); if (name && p.auto !== false) p.name = String(name).slice(0, 120); saveList(a);
  }
  function remove(id) {
    saveList(list().filter(function (x) { return x.id !== id; }));
    try { localStorage.removeItem('svcthumb@' + id); } catch (e) { /* */ }
    db().then(function (d) { d.transaction('st', 'readwrite').objectStore('st').delete(id); }).catch(function () {});
  }

  /* ---------- IndexedDB ---------- */
  var _db = null;
  function db() {
    if (_db) return _db;
    _db = new Promise(function (ok, no) {
      var r = indexedDB.open('archemistry-dk', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('st'); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); };
    });
    return _db;
  }
  function get(id) { return db().then(function (d) { return new Promise(function (ok) { var q = d.transaction('st').objectStore('st').get(id); q.onsuccess = function () { ok(q.result || null); }; q.onerror = function () { ok(null); }; }); }); }
  function put(id, v) { return db().then(function (d) { return new Promise(function (ok) { var t = d.transaction('st', 'readwrite'); t.objectStore('st').put(v, id); t.oncomplete = function () { ok(); }; t.onerror = function () { ok(); }; }); }); }

  /* ---------- holatni saqlash / tiklash ---------- */
  function enc(v) {
    if (v && typeof HTMLImageElement !== 'undefined' && v instanceof HTMLImageElement) return { __img: v.src };
    if (Array.isArray(v)) return v.map(enc);
    if (v && typeof v === 'object') { var o = {}; for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = enc(v[k]); return o; }
    return v;
  }
  function dec(v, waits) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.__img === 'string') {
      var im = new Image(); waits.push(new Promise(function (ok) { im.onload = im.onerror = function () { ok(); }; })); im.src = v.__img; return im;
    }
    if (Array.isArray(v)) return v.map(function (x) { return dec(x, waits); });
    if (v && typeof v === 'object') { var o = {}; for (var k in v) o[k] = dec(v[k], waits); return o; }
    return v;
  }
  var lastSrc = null, lastImg = null, timer = 0;
  function srcUrl() {
    if (!S.src) return null;
    if (S.src === lastSrc && lastImg) return lastImg;
    try { lastImg = S.src.toDataURL ? S.src.toDataURL('image/jpeg', 0.85) : null; lastSrc = S.src; } catch (e) { lastImg = null; }
    return lastImg;
  }
  function thumb() {
    try {
      var W = 480, H = 236, c = document.createElement('canvas'); c.width = W; c.height = H;
      // 4-qadam — peshlavha bilan chizma (kanvas), aks holda fasad rasmining oʻzi; rasm yoʻq — karta rasmi yozilmaydi
      var src = S.step >= 4 && S.view ? document.getElementById('cv') : S.src; if (!src) return;
      var g = c.getContext('2d'), k = Math.min(W / src.width, H / src.height), w = src.width * k, h = src.height * k;
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
      var u = c.toDataURL('image/jpeg', 0.72); if (u.length < 90000) localStorage.setItem('svcthumb@' + PID, u);
    } catch (e) { /* */ }
  }
  function nameOf() {
    var s = (S.signs || []).find(function (x) { return x.uz || x.alt; });
    return s ? (s.uz || s.alt) : '';
  }
  function save() {
    if (!PID || S.sample) return;
    var o = {}; KEEP.forEach(function (k) { o[k] = enc(S[k]); });
    put(PID, { v: 1, t: Date.now(), S: o, img: srcUrl() });
    if (PID.indexOf('s_') === 0) { touch(PID, nameOf()); thumb(); }
  }
  function later() { clearTimeout(timer); timer = setTimeout(save, 1200); }

  function restore(rec) {
    var waits = [], st = dec(rec.S || {}, waits), im = null;
    if (rec.img) { im = new Image(); waits.push(new Promise(function (ok) { im.onload = im.onerror = function () { ok(); }; })); im.src = rec.img; }
    return Promise.all(waits).then(function () {
      KEEP.forEach(function (k) { if (k in st) S[k] = st[k]; });
      S.sample = false; S.F = null; S.Fb = null; S.view = null;
      if (im && im.naturalWidth) { var C = document.createElement('canvas'); C.width = im.naturalWidth; C.height = im.naturalHeight; C.getContext('2d').drawImage(im, 0, 0); S.src = C; lastSrc = C; lastImg = rec.img; }
      else { S.src = null; S.step = 1; }
      try {
        if (S.src && S.step >= 3 && S.door && S.door.q && S.door.q.length === 4) { rectify(); if (S.step >= 4) { syncGeometry(); S.signs.forEach(layout); } }
        else if (S.step > 2) S.step = S.src ? 2 : 1;
      } catch (e) { S.step = S.src ? 2 : 1; }
    });
  }
  function fresh() {
    S.sample = false; S.src = null; S.F = null; S.Fb = null; S.view = null; S.lines = null; S.signs = []; S.windows = []; S.bezak = false; S.sel = null; S.step = 1;
    S.door = { q: [], w: 100, h: 220 };
    var tip = Q.get('tip'); if (tip) { S.tip = tip; S.tipFromMap = true; }
  }
  function start() {
    var sh = document.getElementById('sampleTag'); if (sh) sh.hidden = true;
    renderSteps(); renderCard(); evaluate(); draw();
    // har chizishdan keyin — 1,2 s kechikib saqlash
    var d0 = window.draw; window.draw = function () { var r = d0.apply(this, arguments); later(); return r; };
    window.addEventListener('pagehide', save);
  }

  /* ---------- loyihalar paneli (eshik) ---------- */
  function href(id) { var q = new URLSearchParams(location.search); q.delete('asosiy'); q.set('p', id); return 'dizaynkod.html?' + q.toString(); }
  function panel() {
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
    var a = list().sort(function (x, y) { return String(y.updated).localeCompare(String(x.updated)); });
    var fmt = function (t) { try { return new Date(t).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } };
    var el = document.createElement('div'); el.id = 'dkWin'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="dkw-in">' +
      '<h1>' + esc(T('Peshlavhalar')) + '</h1>' +
      '<p class="dkw-lead">' + esc(T('Har bir peshlavha — alohida loyiha: fasad rasmi, eshik, oʻlchamlar va tekshiruv natijasi saqlanadi.')) + '</p>' +
      '<button type="button" id="dkNew" class="dkw-new">+ ' + esc(T('Yangi peshlavha')) + '</button>' +
      '<div class="dkw-grid" id="dkList">' + a.map(function (p) {
        var th = ''; try { th = localStorage.getItem('svcthumb@' + p.id) || ''; } catch (e) { /* */ }
        th = /^data:image\/(png|jpeg|webp|svg\+xml)[;,]/.test(th) ? '<img alt="" src="' + esc(th) + '">' : '<span class="dkw-ph"></span>';
        return '<a class="dkw-card" data-dk="' + esc(p.id) + '" href="' + esc(href(p.id)) + '"><span class="dkw-th">' + th + '</span><b>' + esc(p.name) + '</b><span class="dkw-t">' + esc(T('oʻzgargan')) + ': ' + esc(fmt(p.updated)) + '</span>' +
          '<button type="button" class="dkw-del" data-del="' + esc(p.id) + '" aria-label="' + esc(T('Oʻchirish')) + '" title="' + esc(T('Oʻchirish')) + '">×</button></a>';
      }).join('') + '</div>' +
      (a.length ? '' : '<p class="dkw-empty">' + esc(T('Hali peshlavha yoʻq. «Yangi peshlavha» bilan boshlang.')) + '</p>') +
      '</div>';
    document.body.appendChild(el);
    document.getElementById('dkNew').onclick = function () { var p = create(T('Peshlavha') + ' ' + (list().length + 1)); location.href = href(p.id); };
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-del]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var id = b.getAttribute('data-del'), p = list().find(function (x) { return x.id === id; });
      if (!confirm('«' + (p ? p.name : '') + '» ' + T('oʻchirilsinmi? Buni qaytarib boʻlmaydi.'))) return;
      remove(id); el.remove(); panel();
    });
  }

  /* dizaynkod.html boot → true: namuna ochilmaydi */
  window.dkBoot = function () {
    if (LEGACY) return false;
    if (!PID) { panel(); return true; }
    if (PID.indexOf('s_') === 0 && !list().some(function (x) { return x.id === PID; })) {
      var t = new Date().toISOString(); saveList([{ id: PID, name: T('Peshlavha'), created: t, updated: t }].concat(list()));
    }
    get(PID).then(function (rec) { return rec ? restore(rec) : fresh(); }).catch(fresh).then(start);
    return true;
  };
  window.__dk = { save: save, list: list };
})();
