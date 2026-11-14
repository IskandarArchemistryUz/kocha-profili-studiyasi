/**
 * 4-bosqich (14.11.2026): sayt sahifalarida xizmatning jonli fon naqshi va boʻlimga oʻtish (ilovadagi ui/backdrop.ts, ui/otish.ts ning sodda nusxasi).
 * - <body data-naqsh="dk"> — css/naqsh/<id>.svg fon ustida, panellar ostida; 3 s dan keyin toʻxtaydi.
 * - xizmat kartasi/havolasi bosilsa — xizmat rangidagi qatlam ekranga kengayadi, keyin sahifa ochiladi; ochilgan sahifa naqsh bilan kutib oladi.
 */
(function () {
  var A = { dk: ['20,154,166', .35, .4] };
  var PAL = { mr: ['#ffffff', '#141414', 0, '20,20,20'], ks: ['#f1f3f8', '#0f1220', 0, '76,91,212'], joy: ['#f7f1ec', '#15100d', 1, '240,138,93'],
    dk: ['#eaf3f3', '#05272b', 1, '20,154,166'], chz: ['#eee9df', '#17121a', 0, '139,74,156'], ren: ['#f4f1ea', '#0b0b0b', 1, '255,197,61'] };
  var reduced = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  function css() { if (document.getElementById('naqshCss')) return; var l = document.createElement('link'); l.id = 'naqshCss'; l.rel = 'stylesheet'; l.href = 'css/naqsh.css?v=2'; document.head.appendChild(l); }
  function dark(id) { var t = null; try { t = localStorage.getItem('mr-theme'); } catch (e) {} if (t === 'dark') return true; if (t === 'light') return false; return !!PAL[id][2] || !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function layer(id, cls) {
    var p = PAL[id], d = dark(id), el = document.createElement('div');
    el.className = 'otish ' + cls; el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--ot-bg', d ? p[1] : p[0]); el.style.setProperty('--ot-fg', d ? '#f2f1ee' : '#141414'); el.style.setProperty('--acc', p[3]);
    if (id === 'dk') fetch('css/naqsh/dk.svg?v=1').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { el.insertAdjacentHTML('afterbegin', t); }).catch(function () {});
    else { var dt = document.createElement('div'); dt.className = 'ot-dots'; el.appendChild(dt); }
    var ln = document.createElement('div'); ln.className = 'ot-line'; el.appendChild(ln);
    return el;
  }
  function svcOf(href) {
    if (/kochasoz\.html/.test(href)) return 'ks'; if (/joyshunos\.html/.test(href)) return 'joy'; if (/render\.html/.test(href)) return 'ren';
    if (/dizaynkod\.html/.test(href)) return 'dk'; if (/chizmadon/.test(href)) return 'chz'; if (/(^|\/)app\/?(#|$)/.test(href)) return 'mr'; return null;
  }
  function links() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduced()) return;
      var a = e.target && e.target.closest && e.target.closest('a.d[href], header.eko a[data-svc]'); if (!a || a.getAttribute('aria-current') === 'page' || a.target === '_blank') return;
      var href = a.getAttribute('href'), id = svcOf(href); if (!id) return;
      e.preventDefault(); css();
      var r = a.getBoundingClientRect(), W = innerWidth, H = innerHeight, el = layer(id, 'out');
      el.style.setProperty('--ot-from', Math.max(0, r.top) + 'px ' + Math.max(0, W - r.right) + 'px ' + Math.max(0, H - r.bottom) + 'px ' + Math.max(0, r.left) + 'px');
      document.body.appendChild(el);
      try { sessionStorage.setItem('otish', JSON.stringify({ id: id, t: Date.now() })); } catch (x) {}
      setTimeout(function () { location.href = href; }, 430);
    });
  }
  function enter(id) {
    var o = null; try { o = JSON.parse(sessionStorage.getItem('otish') || 'null'); sessionStorage.removeItem('otish'); } catch (e) {}
    if (!o || Date.now() - o.t > 5000 || reduced() || !PAL[id]) return;
    css(); var el = layer(id, 'in'); document.body.appendChild(el); setTimeout(function () { el.remove(); }, 1300);
  }
  function go() {
    links();
    var id = document.body.getAttribute('data-naqsh'); var n = A[id]; if (!n) return;
    enter(id); css();
    document.documentElement.style.setProperty('--acc', n[0]);
    var el = document.createElement('div'); el.className = 'nq'; el.setAttribute('aria-hidden', 'true'); el.setAttribute('data-naqsh', id);
    el.style.setProperty('--nq-op', n[1]); el.style.setProperty('--nq-op-d', n[2]);
    document.body.insertBefore(el, document.body.firstChild);
    setTimeout(function () { el.classList.add('still'); }, 3200);   // faqat kirganda harakatlanadi
    fetch('css/naqsh/' + id + '.svg?v=1').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { el.innerHTML = t; }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
