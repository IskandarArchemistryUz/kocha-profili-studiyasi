/* Binokor vaqtincha saytdan olingan (15.11.2026, Iskandar qarori): takomillashtiriladi. Sahifa faqat Lab egasiga ochiladi
   (/me → owner), localhost da — sinov uchun ochiq. Qolganlar bosh sahifaga qaytariladi. Qaytarish: shu blokni olib tashlang
   va index.html / narxlar.html menyusiga Binokor kartasini qaytaring. */
(function () {
  var h = location.hostname; if (h === 'localhost' || h === '127.0.0.1') return;
  var de = document.documentElement; de.style.visibility = 'hidden';
  var api = 'https://api.archemistry.uz'; try { api = localStorage.getItem('kps_api') || api; } catch (e) {}
  var out = function () { location.replace('../index.html'); };
  fetch(api + '/me', { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) { if (m && m.owner) de.style.visibility = ''; else out(); }).catch(out);
})();
/* Binokor — Archemistry Lab qobig'i (E varianti, 15.11.2026). binokor-lab.css bilan birga.
   Faqat joylashuvni o'zgartiradi: elementlar ko'chiriladi (hodisalar o'zi bilan ketadi), hech biri o'chirilmaydi. */
(function () {
  var d = document, hd = d.querySelector('body>header'); if (!hd) return;
  var LOGO = '<svg viewBox="0 0 103.45 100" width="21" height="20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M0.18 99.88C0.05 99.75 0 99.62 0.02 99.5C0.04 99.41 9.94 83.09 22.02 63.24C34.11 43.39 44.08 27 44.19 26.82C44.29 26.63 44.36 26.42 44.34 26.33C44.31 26.25 40.81 20.46 36.56 13.47C32.3 6.48 28.8 0.68 28.78 0.58C28.76 0.46 28.81 0.33 28.95 0.2L29.15 0L46.81 0L64.48 0L64.66 0.14C64.77 0.24 64.84 0.37 64.84 0.52C64.84 0.68 63.31 3.25 59.55 9.4C55.65 15.8 54.27 18.13 54.27 18.3C54.27 18.47 60.6 28.92 78.87 58.93C92.4 81.14 103.49 99.4 103.51 99.5C103.53 99.62 103.48 99.74 103.34 99.88L103.14 100.08L0.38 100.08ZM84.67 98.63C86.09 97.94 86.73 96.21 86.07 94.85C85.63 93.94 49.16 34.17 48.84 33.84C47.73 32.69 45.86 32.72 44.74 33.91C44.4 34.26 7.73 94.44 7.5 95.02C7.38 95.3 7.34 95.6 7.34 96.04L7.34 96.67L7.55 97.13C7.93 97.97 8.55 98.54 9.35 98.79L9.68 98.89L46.94 98.88L84.21 98.86ZM52.47 11.63C52.97 11.5 53.52 11.19 53.86 10.84C54.1 10.58 57.46 5.09 57.73 4.51C57.87 4.21 57.91 3.98 57.91 3.56L57.92 3L57.68 2.53C57.42 2.01 57.09 1.67 56.56 1.39L56.23 1.21L47.3 1.21L46.88 1.45C46.1 1.88 45.69 2.53 45.63 3.42C45.61 3.76 45.63 4.09 45.69 4.28C45.81 4.65 49.38 10.53 49.67 10.84C50.15 11.34 51.04 11.74 51.73 11.75C51.88 11.75 52.21 11.7 52.47 11.63Z"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var brand = hd.querySelector('.brand');
  if (brand && !d.querySelector('.lab-brand')) {
    var back = d.createElement('a'); back.className = 'lab-back'; back.href = '../index.html'; back.title = 'Bosh sahifa'; back.setAttribute('aria-label', 'Bosh sahifa'); back.innerHTML = CHEV;
    var lab = d.createElement('a'); lab.className = 'lab-brand'; lab.href = '../index.html'; lab.innerHTML = LOGO + '<span>Archemistry Lab</span>'; lab.title = 'Archemistry Lab'; lab.setAttribute('aria-label', 'Archemistry Lab');
    hd.insertBefore(back, brand); hd.insertBefore(lab, brand);
  }
  // Toolbox: belgi + ishora (nomi title'da)
  d.querySelectorAll('#tools .tool').forEach(function (b) { var t = (b.textContent || '').trim(); if (t && !b.title) { b.title = t; b.setAttribute('aria-label', t); } });
  // Tahrir tugmalari sarlavhadan sahna ustiga (tablar qatorining o'ngi)
  var center = d.querySelector('#m-model>.center'), ids = ['bMove', 'bRotF', 'bOff', 'bArr', 'bExt', 'bRot', 'bMir', 'bLock', 'bDel', '|', 'bFit'];
  if (center && !d.querySelector('.lab-edit')) {
    var bar = d.createElement('div'); bar.className = 'lab-edit'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Tahrir');
    ids.forEach(function (id) { if (id === '|') { var s = d.createElement('span'); s.className = 'sep'; bar.appendChild(s); return; } var b = d.getElementById(id); if (b) bar.appendChild(b); });
    center.appendChild(bar);
    // sarlavhada qolgan ortiqcha ajratgichlarni yig'ish
    var prev = null; Array.prototype.slice.call(hd.children).forEach(function (el) { if (el.classList.contains('sep')) { if (prev && prev.classList.contains('sep')) el.remove(); else prev = el; } else prev = el; });
  }
})();

/* Masshtabga bog'langan sahna kataklari (ArchiCAD to'ri kabi).
   Kataklar haqiqiy o'lchamda: 10 mm, 50 mm, 10 sm, 50 sm, 1 m, 5 m, 10 m, 50 m, 100 m …
   Har daraja chizig'ining shaffofligi faqat ekrandagi oralig'iga bog'liq: oraliq 8 px ga yaqinlashganda
   chiziq silliq so'nadi, 40 px dan kattada to'liq ko'rinadi. Shuning uchun uzoqlashganda chiziqlar
   ko'payib ketmaydi, darajalar o'rtasidagi o'tish sezilmaydi. Reja surilsa va kattalashsa — kataklar
   modelga yopishgan holda birga siljiydi. */
(function () {
  var st = document.getElementById('stage'); if (!st) return;
  var LV = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
  var lab = function (mm) { return mm < 100 ? mm + ' mm' : mm < 1000 ? mm / 10 + ' sm' : mm < 1e6 ? mm / 1000 + ' m' : mm / 1e6 + ' km'; };
  var gs = null, vz = document.getElementById('vz'); if (vz) { gs = document.createElement('span'); gs.className = 'lab-gs'; gs.title = 'Sahna katagi (eng mayda ko‘rinib turgan)'; vz.insertBefore(gs, vz.firstChild); }
  var last = '';
  function sm(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function tick() {
    var key = '';
    try {
      if (typeof MODE !== 'undefined' && MODE === 'model' && VIEW === 'plan' && VT && VT.s > 0) key = VT.s.toFixed(6) + '|' + VT.ox.toFixed(1) + '|' + VT.oy.toFixed(1);
      else key = 'off|' + (typeof VIEW !== 'undefined' ? VIEW : '');
    } catch (e) { key = 'off'; }
    if (key !== last) {
      last = key;
      if (key.indexOf('off') === 0) { st.style.backgroundImage = st.style.backgroundSize = st.style.backgroundPosition = st.style.backgroundAttachment = ''; if (gs) gs.textContent = ''; }
      else {
        var img = [], size = [], pos = [], first = null;
        for (var i = 0; i < LV.length; i++) {
          var px = LV[i] * VT.s; if (px < 8) continue; if (px > 4000) break;
          var a = 0.085 * sm(8, 40, px) + (px > 160 ? 0.03 * sm(160, 400, px) : 0); if (a < 0.004) continue;
          if (!first) first = LV[i];
          var c = 'rgba(20,20,20,' + a.toFixed(3) + ')';
          img.push('linear-gradient(' + c + ' 1px,transparent 1px)', 'linear-gradient(90deg,' + c + ' 1px,transparent 1px)');
          var sz = px + 'px ' + px + 'px'; size.push(sz, sz);
          var p = ((VT.ox % px) + px) % px + 'px ' + ((VT.oy % px) + px) % px + 'px'; pos.push(p, p);
          if (img.length >= 6) break;
        }
        st.style.backgroundImage = img.join(','); st.style.backgroundSize = size.join(','); st.style.backgroundPosition = pos.join(','); st.style.backgroundAttachment = 'scroll';
        if (gs) gs.textContent = first ? '▦ ' + lab(first) : '';
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* Tillar (2-bosqich, 15.11): Binokor Lab tillar tizimiga ulanadi — til `mr-lang` (Labning qolgan ilovalari bilan bitta).
   Binokor matni oʻzbekcha yozilgan; bu qatlam sahifadagi matnni (va title/placeholder) lugʻat bo'yicha almashtiradi:
   1) aniq moslik, 2) raqamlar # bilan almashtirilgan andoza, 3) « · », « — », «: » bo'laklari bo'yicha.
   Chizma (SVG), buyruqlar matni, jurnal va qiymati matn bo'lgan <option> tarjima qilinmaydi (model maʼlumoti).
   uz — yangi atamalar (BINOKOR_UZ_TERMS) va oʻ/gʻ uchun U+02BB. es, pt, fr, az, uk, tr, kk — hozircha inglizcha. */
(function () {
  var D = window.BINOKOR_I18N || {}, UZT = window.BINOKOR_UZ_TERMS || [];
  var LANGS = [['uz', 'Oʻzbekcha'], ['en', 'English'], ['ru', 'Русский'], ['es', 'Español'], ['pt', 'Português (BR)'], ['fr', 'Français'], ['az', 'Azərbaycanca'], ['uk', 'Українська'], ['tr', 'Türkçe'], ['kk', 'Қазақша']];
  var ids = LANGS.map(function (l) { return l[0]; });
  function getLang() {
    try { var v = localStorage.getItem('mr-lang') || localStorage.getItem('kps_lang'); if (ids.indexOf(v) >= 0) return v; } catch (e) {}
    try { var a = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
      for (var i = 0; i < a.length; i++) { var b = String(a[i] || '').toLowerCase().split(/[-_]/)[0]; if (ids.indexOf(b) >= 0) return b; if (['ky', 'tg', 'tk', 'be'].indexOf(b) >= 0) return 'ru'; } } catch (e) {}
    return 'en';
  }
  var L = getLang(), IX = L === 'ru' ? 1 : 0; document.documentElement.lang = L;

  // ——— sarlavhadagi til menyusi (Labdagi kabi)
  var hd = document.querySelector('body>header');
  if (hd && !document.querySelector('.lab-lang')) {
    var w = document.createElement('div'); w.className = 'lab-lang';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'lab-lang-btn'; b.textContent = L.toUpperCase(); b.setAttribute('aria-haspopup', 'menu'); b.title = 'Til / Language';
    var m = document.createElement('div'); m.className = 'lab-lang-pop'; m.hidden = true; m.setAttribute('role', 'menu');
    LANGS.forEach(function (l) { var x = document.createElement('button'); x.type = 'button'; x.setAttribute('role', 'menuitemradio'); x.setAttribute('aria-checked', String(l[0] === L)); x.innerHTML = '<span>' + l[1] + '</span><span class="lid">' + l[0] + '</span>';
      x.onclick = function () { try { localStorage.setItem('mr-lang', l[0]); localStorage.setItem('kps_lang', l[0]); } catch (e) {} location.reload(); }; m.appendChild(x); });
    b.onclick = function (e) { e.stopPropagation(); m.hidden = !m.hidden; if (!m.hidden) { var r = b.getBoundingClientRect(); m.style.top = (r.bottom + 6) + 'px'; m.style.right = (innerWidth - r.right) + 'px'; } };
    document.addEventListener('click', function () { m.hidden = true; });
    w.appendChild(b); document.body.appendChild(m); hd.appendChild(w);
  }

  // ——— tarjima
  var UZRE = UZT.map(function (p) { return [new RegExp('(^|[^A-Za-zʻ‘’ʼ\'])' + p[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), p[1]]; });
  function uz(s) { var t = s; UZRE.forEach(function (r) { t = t.replace(r[0], function (_, a) { return a + r[1]; }); }); return t.replace(/([OoGg])[‘']/g, '$1ʻ').replace(/([a-z])’/g, '$1ʼ'); }
  function look(s) {
    var d = D[s]; if (d) return d[IX] != null ? d[IX] : d[0];
    var nums = [], t = s.replace(/\d+(?:[.,]\d+)?/g, function (x) { nums.push(x); return '#'; });
    if (nums.length && (d = D[t])) { var i = 0, v = d[IX] != null ? d[IX] : d[0]; return v.indexOf('#') >= 0 ? v.replace(/#/g, function () { return nums[i] != null ? nums[i++] : '#'; }) : v; }
    return null;
  }
  function tr(s) {
    if (L === 'uz') { var u = uz(s); return u !== s ? u : null; }
    var r = look(s); if (r != null) return r;
    var seps = [' · ', ' — ', ': ', ' → '];
    for (var k = 0; k < seps.length; k++) { if (s.indexOf(seps[k]) < 0) continue; var ps = s.split(seps[k]), hit = false;
      var out = ps.map(function (p) { var q = p.trim(), x = q && look(q); if (x != null) { hit = true; return p.replace(q, x); } var y = q && q.indexOf(' ') > 0 ? tr(q) : null; if (y != null && y !== q) { hit = true; return p.replace(q, y); } return p; });
      if (hit) return out.join(seps[k]); }
    return null;
  }
  var SKIP = '#canvas,svg,textarea,pre,.log,#tests,#chStage,#script,#agOut,#labAI .ai-a,#labAI .ai-u,#labAI .ai-ch,#labAI .ai-err,.lab-lang,.lab-lang-pop,script,style';
  function skipEl(el) { return !el || (el.closest && el.closest(SKIP)) || (el.tagName === 'OPTION' && !el.hasAttribute('value')); }
  function doText(n) {
    var v = n.nodeValue; if (!v || !/[A-Za-zʻ‘’]{2}/.test(v) || skipEl(n.parentElement)) return;
    var s = v.replace(/\s+/g, ' ').trim(), r = tr(s); if (r == null || r === s) return;
    var lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0]; n.nodeValue = lead + r + trail;
  }
  function doAttrs(el) {
    if (!el.getAttribute || skipEl(el)) return;
    ['title', 'placeholder', 'aria-label'].forEach(function (a) { var v = el.getAttribute(a); if (!v || !/[A-Za-z]{2}/.test(v)) return; var s = v.replace(/\s+/g, ' ').trim(), r = tr(s); if (r != null && r !== s) el.setAttribute(a, r); });
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || skipEl(root)) return;
    doAttrs(root); root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(doAttrs);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, list = []; while ((n = tw.nextNode())) list.push(n); list.forEach(doText);
  }
  if (L === 'uz' && !UZRE.length) return;
  walk(document.body);
  new MutationObserver(function (ms) { ms.forEach(function (m) {
    if (m.type === 'characterData') doText(m.target);
    else if (m.type === 'attributes') doAttrs(m.target);
    else m.addedNodes.forEach(walk);
  }); }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'] });
})();
