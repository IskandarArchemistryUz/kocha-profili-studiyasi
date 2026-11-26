/* Binokor — loyihalar (26.11.2026). Tahlil: claude/binokor-mantiq-tahlili-26-11.md, 0-bosqich.
   Boshqa xizmatlardagi tartib (storage/svcprojects, js/dk-loyiha.js) bilan bir xil:
   - ?p= yoʻq — Binokor ishlamaydi, avval oʻz loyihalari paneli (yangi / mavjud).
   - ?p=s_… — Binokor loyihasi (roʻyxat `svcp:bk`); ?p=p_… — Master reja loyihasi ichidagi bino.
   - Holat brauzerda `kalit@<id>`: binokor-v2 (buyruqlar), binokor-chz (albom), binokor-ul (tayanch chizma); karta rasmi `svcthumb@<id>`.
   - Loyihasiz eski ish (binokor-v2) bir marta nomli loyihaga koʻchiriladi (`svcmig:bk`), asl kalit oʻchirilmaydi.
   Yadro (binokor.html) oʻzgarmaydi: u umumiy kalitdan ochadi, bu fayl darhol loyiha holatini yuklaydi va saqlashni loyihaga yoʻnaltiradi.
   binokor-safe.js dan OLDIN yuklanishi shart (aks holda loyihani ochish «model almashtirildi» deb suratga olinadi). */
(function () {
  'use strict';
  if (typeof rebuild !== 'function' || typeof fromFile !== 'function' || typeof toFile !== 'function') return;
  var REG = 'svcp:bk', MIG = 'svcmig:bk', KV2 = 'binokor-v2', KCH = 'binokor-chz', KUL = 'binokor-ul';
  var FRESH = ['grid x 6 6', 'grid y 6', 'levels 1 3.0'];
  var Q = new URLSearchParams(location.search), PID = Q.get('p');
  if (PID && !/^[sp]_[A-Za-z0-9]{4,40}$/.test(PID)) PID = null;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* */ } } };
  var lang = function () { return LS.get('mr-lang') || LS.get('kps_lang') || (navigator.language || 'en').slice(0, 2); };
  var T = function (s) { var L = lang(); if (L === 'uz') return s; var v = (window.BINOKOR_I18N || {})[s]; return v ? (L === 'ru' ? v[1] : v[0]) : s; };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };

  /* ---------- roʻyxat (svcp:bk — storage/svcprojects bilan bir xil shakl) */
  function list() { try { var a = JSON.parse(LS.get(REG) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && typeof x.id === 'string'; }) : []; } catch (e) { return []; } }
  function saveList(a) { LS.set(REG, JSON.stringify(a)); }
  function create(name, extra) {
    var t = new Date().toISOString(), p = { id: 's_' + Math.random().toString(36).slice(2, 12), name: String(name).slice(0, 120), created: t, updated: t };
    if (extra) for (var k in extra) p[k] = extra[k];
    saveList([p].concat(list())); return p;
  }
  function touch(id) { var a = list(), p = a.find(function (x) { return x.id === id; }); if (!p) return; p.updated = new Date().toISOString(); saveList(a); }
  function rename(id, name) { var a = list(), p = a.find(function (x) { return x.id === id; }); name = String(name || '').trim().slice(0, 120); if (!p || !name) return; p.name = name; saveList(a); }
  function remove(id) {
    saveList(list().filter(function (x) { return x.id !== id; }));
    var suf = '@' + id, ks = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.slice(-suf.length) === suf) ks.push(k); } } catch (e) { /* */ }
    ks.forEach(LS.del);
  }
  var href = function (id) { var q = new URLSearchParams(location.search); q.set('p', id); return 'binokor.html?' + q.toString(); };
  var nextName = function () { return T('Yangi loyiha') + ' ' + (list().length + 1); };

  /* ---------- eski (loyihasiz) ishni bir marta koʻchirish */
  function migrate() {
    if (LS.get(MIG)) return; LS.set(MIG, '1');
    var t = LS.get(KV2); if (!t) return;
    var cmds = null; try { cmds = fromFile(t); } catch (e) { return; }
    var txt = (cmds || []).join('\n'), sample = false;
    try { for (var k in SAMPLE) if (SAMPLE[k] === txt) sample = true; } catch (e) { /* */ }
    if (!cmds || !cmds.length || sample || txt === FRESH.join('\n')) return;      /* namuna yoki boʻsh — koʻchirishga arzimaydi */
    var p = create('Binokor — ' + T('eski ish'), { legacy: true });
    LS.set(KV2 + '@' + p.id, t);
    [KCH, KUL].forEach(function (key) { var v = LS.get(key); if (v) LS.set(key + '@' + p.id, v); });
  }

  /* ---------- loyihalar paneli */
  var FOLDER = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h6l2 2h10v10H3z"/></svg>';
  var fmt = function (t) { try { return new Date(t).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } };
  function confirmDel(p, done) {
    var text = '«' + p.name + '» — ' + T('model va albom brauzerdan oʻchadi. Buni qaytarib boʻlmaydi.');
    if (typeof window.bkAsk === 'function') window.bkAsk(T('Loyiha oʻchirilsinmi?'), text, T('Oʻchirish'), done); else done();
  }
  function panel(gate) {
    var old = document.getElementById('bkProj'); if (old) old.remove();
    var a = list().sort(function (x, y) { return String(y.updated).localeCompare(String(x.updated)); });
    var el = document.createElement('div'); el.id = 'bkProj'; el.className = 'bkp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Binokor · ' + T('loyihalar'));
    el.innerHTML = '<div class="bkp-in">'
      + '<header class="bkp-bar">' + (gate ? '<a class="btn" id="bkpHome" href="../index.html">‹ Archemistry Lab</a>' : '') + '<span class="bkp-badge"><i></i>Binokor</span><span style="flex:1"></span>'
      + (gate ? '' : '<button type="button" class="btn" id="bkpClose" aria-label="' + esc(T('Yopish')) + '" title="' + esc(T('Yopish')) + '">×</button>') + '</header>'
      + '<h1>Binokor<span> · ' + esc(T('loyihalar')) + '</span></h1>'
      + '<p class="bkp-lead">' + esc(T('Bino modeli: har loyiha — oʻz modeli, chizmalari va albomi.')) + '</p>'
      + '<button type="button" class="btn p" id="bkpNew">+ ' + esc(T('Yangi loyiha')) + '</button>'
      + '<div class="bkp-grid" id="bkpList">' + a.map(function (p) {
        var th = LS.get('svcthumb@' + p.id) || '';
        th = /^data:image\/(png|jpeg|webp|svg\+xml)[;,]/.test(th) ? '<img alt="" src="' + esc(th) + '">' : '';
        return '<a class="bkp-card' + (p.id === PID ? ' cur' : '') + '" data-bk="' + esc(p.id) + '" href="' + esc(href(p.id)) + '">'
          + '<span class="bkp-th">' + th + (p.id === PID ? '<em>' + esc(T('ochiq')) + '</em>' : '') + '</span>'
          + '<b>' + esc(p.name) + '</b><span class="bkp-t">' + esc(T('oʻzgargan')) + ': ' + esc(fmt(p.updated)) + '</span>'
          + '<span class="bkp-act"><button type="button" data-ren="' + esc(p.id) + '" aria-label="' + esc(T('Nomini oʻzgartirish')) + '" title="' + esc(T('Nomini oʻzgartirish')) + '">✎</button>'
          + '<button type="button" data-del="' + esc(p.id) + '" aria-label="' + esc(T('Oʻchirish')) + '" title="' + esc(T('Oʻchirish')) + '">×</button></span></a>';
      }).join('') + '</div>'
      + (a.length ? '' : '<p class="bkp-empty">' + esc(T('Hali loyiha yoʻq. «Yangi loyiha» bilan boshlang.')) + '</p>')
      + '</div>';
    document.body.appendChild(el);
    var close = function () { el.remove(); document.removeEventListener('keydown', key, true); };
    var key = function (e) { if (!document.getElementById('bkProj')) return; if (document.querySelector('.bks-ov') || (e.target && e.target.tagName === 'INPUT')) return; e.stopImmediatePropagation(); if (e.key === 'Escape' && !gate) close(); };
    document.addEventListener('keydown', key, true);
    var cl = el.querySelector('#bkpClose'); if (cl) cl.onclick = close;
    el.querySelector('#bkpNew').onclick = function () { var p = create(nextName()); location.href = href(p.id); };
    el.addEventListener('click', function (e) {
      var d = e.target.closest && e.target.closest('[data-del]'), r = e.target.closest && e.target.closest('[data-ren]');
      if (e.target.tagName === 'INPUT') { e.preventDefault(); return; }
      if (!d && !r) return; e.preventDefault(); e.stopPropagation();
      var id = (d || r).getAttribute(d ? 'data-del' : 'data-ren'), p = list().find(function (x) { return x.id === id; }); if (!p) return;
      if (d) { confirmDel(p, function () { remove(id); if (id === PID) { location.href = 'binokor.html'; return; } close(); panel(gate); }); return; }
      var card = r.closest('.bkp-card'), b = card.querySelector('b'), inp = document.createElement('input');
      inp.value = p.name; inp.maxLength = 120; inp.className = 'bkp-inp'; b.replaceWith(inp); inp.focus(); inp.select();
      var fin = false, done = function (ok) { if (fin) return; fin = true; if (ok) rename(id, inp.value); close(); panel(gate); if (id === PID) headBtn(); };
      inp.onkeydown = function (ev) { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); done(true); } else if (ev.key === 'Escape') { ev.preventDefault(); done(false); } };
      inp.onblur = function () { done(true); };
    });
  }

  /* ---------- sarlavhadagi «Loyihalar» tugmasi */
  function headBtn() {
    var hd = document.querySelector('body>header'); if (!hd) return;
    var b = document.getElementById('bkProjBtn'), p = list().find(function (x) { return x.id === PID; }), nm = p ? p.name : '';
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'bkProjBtn'; b.className = 'btn bkp-btn'; b.setAttribute('aria-haspopup', 'dialog'); b.onclick = function () { panel(false); };
      var br = hd.querySelector('.brand'); if (br && br.nextSibling) hd.insertBefore(b, br.nextSibling); else hd.appendChild(b); }
    b.title = T('Loyihalar') + (nm ? ' · ' + nm : ''); b.setAttribute('aria-label', T('Loyihalar'));
    b.innerHTML = FOLDER + '<span></span>'; b.lastChild.textContent = nm || T('Loyihalar');
  }

  /* ---------- eshik: loyihasiz ochilsa — avval panel */
  if (!PID) { migrate(); panel(true); return; }

  /* ---------- loyiha holatini yuklash */
  if (PID.indexOf('s_') === 0 && !list().some(function (x) { return x.id === PID; })) { var t0 = new Date().toISOString(); saveList([{ id: PID, name: nextName(), created: t0, updated: t0 }].concat(list())); }
  (function load() {
    var cmds = null, t = LS.get(KV2 + '@' + PID); if (t) { try { cmds = fromFile(t); } catch (e) { cmds = null; } }
    CMDS = cmds && cmds.length ? cmds : FRESH.slice(); REDO = [];
    var chz = null, c = LS.get(KCH + '@' + PID); if (c) { try { var j = JSON.parse(c); if (j && j.sheets) { j.kind = j.kind || 'loy'; j.store = j.store || {}; chz = j; } } catch (e) { /* */ } }
    CHZ = chz || chzNew(); CHCUR = 0; CHSEL = null; CHUNDO = []; CHREDO = [];
    var ck = document.getElementById('chKind'); if (ck) ck.value = CHZ.kind || 'loy';
    try { UL = JSON.parse(LS.get(KUL + '@' + PID) || '{}') || {}; } catch (e) { UL = {}; }
  })();

  /* ---------- saqlash loyihaga yoʻnaltiriladi */
  var tm = 0, full = false;
  var thumb = function () {
    try {
      if (typeof MODE === 'undefined' || MODE !== 'model' || VIEW !== 'plan') return;
      var svg = document.querySelector('#canvas svg'); if (!svg) return;
      var r = svg.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height); if (w < 50 || h < 50) return;
      var c = svg.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', w); c.setAttribute('height', h);
      if (!c.getAttribute('viewBox')) c.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      var u = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml' })), im = new Image();
      im.onload = function () {
        try {
          var W = 480, H = 236, k = Math.max(W / w, H / h) * 0.9, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var g = cv.getContext('2d');
          g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.drawImage(im, (W - w * k) / 2, (H - h * k) / 2, w * k, h * k);
          var d = cv.toDataURL('image/jpeg', 0.72); if (d.length < 90000) LS.set('svcthumb@' + PID, d);
        } catch (e) { /* */ }
        URL.revokeObjectURL(u);
      };
      im.onerror = function () { URL.revokeObjectURL(u); }; im.src = u;
    } catch (e) { /* */ }
  };
  var later = function () { clearTimeout(tm); tm = setTimeout(function () { touch(PID); thumb(); }, 1500); };
  var saveChz = function () { try { LS.set(KCH + '@' + PID, JSON.stringify(CHZ)); } catch (e) { /* */ } };
  var _rebuild = rebuild;
  rebuild = function () {
    var r = _rebuild.apply(this, arguments);
    if (!LS.set(KV2 + '@' + PID, toFile(CMDS))) { if (!full) { full = true; toast('Brauzer xotirasi toʻldi — loyihani faylga saqlang (Ctrl+S)'); } } else full = false;
    saveChz(); later(); return r;
  };
  if (typeof chzSave === 'function') { var _chz = chzSave; chzSave = function () { var r = _chz.apply(this, arguments); saveChz(); later(); return r; }; }
  if (typeof ulSave === 'function') { var _ul = ulSave; ulSave = function () { var r = _ul.apply(this, arguments); try { localStorage.setItem(KUL + '@' + PID, JSON.stringify(UL)); } catch (e) { /* yadro oʻzi xabar beradi */ } return r; }; }
  window.addEventListener('pagehide', function () { clearTimeout(tm); touch(PID); });

  /* «Yangi loyiha» — joriy modelni oʻchirmaydi: yangi loyiha ochiladi, joriysi roʻyxatda qoladi */
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('#bNew'); if (!b) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    var p = create(nextName()); location.href = href(p.id);
  }, true);

  rebuild(); if (typeof fit === 'function') requestAnimationFrame(fit);
  headBtn();
  window.__bk = { list: list, id: PID };
})();
