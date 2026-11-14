/**
 * 4-bosqich (14.11.2026): sayt sahifalaridagi xizmatning jonli fon naqshi (ilovadagi ui/backdrop.ts ning sodda nusxasi).
 * <body data-naqsh="dk"> — css/naqsh/<id>.svg sahifa foni ustida, panellar ostida; «harakatni kamaytirish»da harakatsiz.
 */
(function () {
  var A = { dk: ['20,154,166', .35, .4] };
  function go() {
    var id = document.body.getAttribute('data-naqsh'); var n = A[id]; if (!n) return;
    document.documentElement.style.setProperty('--acc', n[0]);
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/naqsh.css?v=1'; document.head.appendChild(l);
    var el = document.createElement('div'); el.className = 'nq'; el.setAttribute('aria-hidden', 'true'); el.setAttribute('data-naqsh', id);
    el.style.setProperty('--nq-op', n[1]); el.style.setProperty('--nq-op-d', n[2]);
    document.body.insertBefore(el, document.body.firstChild);
    fetch('css/naqsh/' + id + '.svg?v=1').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { el.innerHTML = t; }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
