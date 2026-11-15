/* Binokor — Archemistry Lab qobig'i (E varianti, 15.11.2026). binokor-lab.css bilan birga.
   Faqat joylashuvni o'zgartiradi: elementlar ko'chiriladi (hodisalar o'zi bilan ketadi), hech biri o'chirilmaydi. */
(function () {
  var d = document, hd = d.querySelector('body>header'); if (!hd) return;
  var LOGO = '<svg viewBox="0 0 103.45 100" width="21" height="20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M0.18 99.88C0.05 99.75 0 99.62 0.02 99.5C0.04 99.41 9.94 83.09 22.02 63.24C34.11 43.39 44.08 27 44.19 26.82C44.29 26.63 44.36 26.42 44.34 26.33C44.31 26.25 40.81 20.46 36.56 13.47C32.3 6.48 28.8 0.68 28.78 0.58C28.76 0.46 28.81 0.33 28.95 0.2L29.15 0L46.81 0L64.48 0L64.66 0.14C64.77 0.24 64.84 0.37 64.84 0.52C64.84 0.68 63.31 3.25 59.55 9.4C55.65 15.8 54.27 18.13 54.27 18.3C54.27 18.47 60.6 28.92 78.87 58.93C92.4 81.14 103.49 99.4 103.51 99.5C103.53 99.62 103.48 99.74 103.34 99.88L103.14 100.08L0.38 100.08ZM84.67 98.63C86.09 97.94 86.73 96.21 86.07 94.85C85.63 93.94 49.16 34.17 48.84 33.84C47.73 32.69 45.86 32.72 44.74 33.91C44.4 34.26 7.73 94.44 7.5 95.02C7.38 95.3 7.34 95.6 7.34 96.04L7.34 96.67L7.55 97.13C7.93 97.97 8.55 98.54 9.35 98.79L9.68 98.89L46.94 98.88L84.21 98.86ZM52.47 11.63C52.97 11.5 53.52 11.19 53.86 10.84C54.1 10.58 57.46 5.09 57.73 4.51C57.87 4.21 57.91 3.98 57.91 3.56L57.92 3L57.68 2.53C57.42 2.01 57.09 1.67 56.56 1.39L56.23 1.21L47.3 1.21L46.88 1.45C46.1 1.88 45.69 2.53 45.63 3.42C45.61 3.76 45.63 4.09 45.69 4.28C45.81 4.65 49.38 10.53 49.67 10.84C50.15 11.34 51.04 11.74 51.73 11.75C51.88 11.75 52.21 11.7 52.47 11.63Z"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var brand = hd.querySelector('.brand');
  if (brand && !d.querySelector('.lab-brand')) {
    var back = d.createElement('a'); back.className = 'lab-back'; back.href = '../index.html'; back.title = 'Bosh sahifa'; back.setAttribute('aria-label', 'Bosh sahifa'); back.innerHTML = CHEV;
    var lab = d.createElement('a'); lab.className = 'lab-brand'; lab.href = '../index.html'; lab.innerHTML = LOGO + '<span>Archemistry Lab</span>';
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
