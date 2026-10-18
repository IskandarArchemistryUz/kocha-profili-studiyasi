/* Archemistry Lab — eski (vanilla) sahifalar uchun umumiy ekotizim sarlavhasi.
 * <header class="eko" data-svc="dk" data-title="Peshlavha studiyasi"></header> — logotip, 5 xizmat, til (uz · en · ru), tungi rejim.
 * Til: kps_lang va mr-lang birga yoziladi (ilova va eski sahifalar bir tilda), tanlansa sahifa yangilanadi (js/i18n.js shunday ishlaydi).
 * Tungi rejim: mr-theme → <html data-theme> (css/ds2.css tokenlari). Ilovadagi ui/theme.ts bilan bir xil kalit. */
(function () {
  'use strict';
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  function dark() { var t = ls.get('mr-theme'); return t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function applyTheme() { document.documentElement.dataset.theme = dark() ? 'dark' : 'light'; }
  applyTheme();
  var LOGO = 'M0.18 99.88C0.05 99.75 -0.00 99.62 0.02 99.50C0.04 99.41 9.94 83.09 22.02 63.24C34.11 43.39 44.08 27.00 44.19 26.82C44.29 26.63 44.36 26.42 44.34 26.33C44.31 26.25 40.81 20.46 36.56 13.47C32.30 6.48 28.80 0.68 28.78 0.58C28.76 0.46 28.81 0.33 28.95 0.20L29.15 0.00L46.81 0.00L64.48 -0.00L64.66 0.14C64.77 0.24 64.84 0.37 64.84 0.52C64.84 0.68 63.31 3.25 59.55 9.40C55.65 15.80 54.27 18.13 54.27 18.30C54.27 18.47 60.60 28.92 78.87 58.93C92.40 81.14 103.49 99.40 103.51 99.50C103.53 99.62 103.48 99.74 103.34 99.88L103.14 100.08L51.76 100.08L0.38 100.08L0.18 99.88ZM84.67 98.63C86.09 97.94 86.73 96.21 86.07 94.85C85.63 93.94 49.16 34.17 48.84 33.84C47.73 32.69 45.86 32.72 44.74 33.91C44.40 34.26 7.73 94.44 7.50 95.02C7.38 95.30 7.34 95.60 7.34 96.04L7.34 96.67L7.55 97.13C7.93 97.97 8.55 98.54 9.35 98.79L9.68 98.89L46.94 98.88L84.21 98.86L84.67 98.63ZM52.47 11.63C52.97 11.50 53.52 11.19 53.86 10.84C54.10 10.58 57.46 5.09 57.73 4.51C57.87 4.21 57.91 3.98 57.91 3.56L57.92 3.00L57.68 2.53C57.42 2.01 57.09 1.67 56.56 1.39L56.23 1.21L51.76 1.21L47.30 1.21L46.88 1.45C46.10 1.88 45.69 2.53 45.63 3.42C45.61 3.76 45.63 4.09 45.69 4.28C45.81 4.65 49.38 10.53 49.67 10.84C50.15 11.34 51.04 11.74 51.73 11.75C51.88 11.75 52.21 11.70 52.47 11.63Z';
  var SVC = [
    ['mr', 'Master reja', 'app/', '--svc-mr'],
    ['ks', 'Koʻchasoz', 'app/kochasoz.html', '--svc-ks'],
    ['joy', 'Joyshunos', 'app/joyshunos.html', '--svc-joy'],
    ['ren', 'Render', 'app/render.html', '--svc-ren', 'beta'],
    ['dk', 'Dizayn-kod', 'dizaynkod.html', '--svc-dk'],
    ['chz', 'Chizmadon', 'app/#/chizmadon', '--svc-chz']
  ];
  var IC = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'
  };
  function lang() { var l = ls.get('kps_lang') || ls.get('mr-lang') || 'en'; return ['uz', 'en', 'ru'].indexOf(l) < 0 ? 'en' : l; }   // sukut — inglizcha
  /* xizmat nomlari (mr/src/i18n/index.ts dagi BRAND bilan bir xil) */
  var NM = { en: { 'Koʻchasoz': 'Street Designer', 'Joyshunos': 'Site Explorer', 'Chizmadon': 'Sheet Studio', 'Master reja': 'Master plan', 'Dizayn-kod': 'Design code' }, ru: { 'Koʻchasoz': 'Конструктор улиц', 'Joyshunos': 'Анализ места', 'Chizmadon': 'Студия листов', 'Master reja': 'Мастер-план', 'Dizayn-kod': 'Дизайн-код' } };
  function nm(s) { var m = NM[lang()]; return m && m[s] || s; }
  function T(s) { return window.kpsT ? window.kpsT(s) : s; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render(h) {
    var cur = h.getAttribute('data-svc') || '', L = lang(), d = dark();
    var extra = h.querySelector('.eko-extra');
    var ex = extra ? extra.outerHTML : '';
    h.innerHTML =
      '<a class="eko-brand" href="index.html" title="Bosh sahifa"><svg viewBox="0 0 103.45 100" width="21" height="20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + LOGO + '"/></svg><span>Archemistry Lab</span></a>' +
      '<span class="eko-vr"></span>' +
      '<nav class="eko-svc" aria-label="Xizmatlar">' + SVC.map(function (s) {
        return '<a href="' + s[2] + '"' + (s[0] === cur ? ' class="on" aria-current="page"' : '') + ' data-svc="' + s[0] + '"><i style="background:var(' + s[3] + ')"></i>' + esc(nm(s[1])) + (s[4] ? '<em class="beta">beta</em>' : '') + '</a>';
      }).join('') + '</nav>' +
      '<span class="eko-sp"></span>' + ex +
      '<div class="eko-lang" id="kpsLang" data-noi18n role="group" aria-label="Til / Language / Язык">' + ['uz', 'en', 'ru'].map(function (k) {
        return '<button type="button" data-lang="' + k + '" aria-pressed="' + (k === L) + '">' + k + '</button>';
      }).join('') + '</div>' +
      '<button type="button" class="eko-ib" id="themeBtn" title="' + (d ? 'Yorugʻ rejim' : 'Tungi rejim') + '" aria-label="' + (d ? 'Yorugʻ rejim' : 'Tungi rejim') + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (d ? IC.sun : IC.moon) + '</svg></button>';
    h.querySelectorAll('.eko-lang button').forEach(function (b) {
      b.onclick = function () { var k = b.getAttribute('data-lang'); if (k === lang()) return; ls.set('kps_lang', k); ls.set('mr-lang', k); location.reload(); };
    });
    h.querySelector('#themeBtn').onclick = function () { ls.set('mr-theme', dark() ? 'light' : 'dark'); applyTheme(); render(h); };
  }
  function init() { var h = document.querySelector('header.eko'); if (h) render(h); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!ls.get('mr-theme') || ls.get('mr-theme') === 'auto') { applyTheme(); init(); } });
})();
