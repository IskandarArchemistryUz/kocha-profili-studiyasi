/* Yershunos — shahar tizimlari va aloqalar (27.11.2026). TAXMINIY MODEL, oʻlchangan oqim emas.
   Usul: gravitatsiya modeli (oqim ≈ aholi_i × aholi_j / masofa²) va «dominant oqim» qoidasi (Nystuen & Dacey 1961) —
   har birlik eng kuchli tortadigan shaharga bogʻlanadi; zanjir oxiridagi shahar — tizim markazi.
   - Tuman: 120 km ichidagi shaharlardan eng kuchli tortuvchisiga (ichida shahar boʻlmasa — eng yaqiniga).
   - Shahar: kattaroq shaharga boʻysunadi, agar 30 km gacha boʻlsa (bir aglomeratsiya), 100 km gacha va u kamida 2 barobar
     katta boʻlsa, yoki 150 km gacha va 10 barobar katta boʻlsa. Aks holda — tizim markazi; uning eng kuchli kattaroq
     shaharga aloqasi «tizimlararo aloqa» sifatida alohida chiziladi.
   - Toshkent shahrining 10 tumani bitta tugun (aholi yigʻindisi, aholi bilan tortilgan markaz).
   - Masofa: hudud geometrik markazlari orasida toʻgʻri chiziq. Togʻ, yoʻl, qatnov vaqti hisobga olinmagan — 2-qadamda
     (OSM yoʻl tarmogʻi) almashtiriladi: YSA.vaqt(matritsa) bilan km oʻrniga daqiqa beriladi.
   Sahifaga ulanish (index.html): uzPick → YSA.blok(p); K.uz → 'al'; qolgani shu faylda (uzDraw/uzVis oʻraladi). */
(function () {
  'use strict';
  if (typeof T !== 'function') return;
  var D = window.YERSHUNOS_I18N || {};
  var I18 = {
    "Aloqalar": ['Connections', 'Связи'],
    "Shahar tizimlari": ['Urban systems', 'Городские системы'],
    "Shahar tizimlari · {0} ta": ['Urban systems · {0}', 'Городские системы · {0}'],
    "{0} birlik · {1} mln": ['{0} units · {1} M', '{0} ед. · {1} млн'],
    "Tizimlararo aloqalar": ['Links between systems', 'Связи между системами'],
    "Har tuman eng kuchli tortadigan shaharga bog'langan: oqim ≈ aholi × aholi / masofa² (dominant oqim usuli). Shahar kattaroq shaharga bo'ysunadi: 30 km gacha — har qanday kattaroqqa, 100 km gacha — kamida 2 barobar kattaga, 150 km gacha — 10 barobar kattaga; aks holda o'zi tizim markazi. TAXMINIY: masofa hudud markazlari orasida to'g'ri chiziq, tog' va yo'llar hisobga olinmagan, haqiqiy qatnov o'lchanmagan.":
      ['Each district is linked to the city that attracts it most: flow ≈ population × population / distance² (dominant-flow method). A city is subordinate to a larger one within 30 km (any larger city), within 100 km (at least twice as large) or within 150 km (ten times as large); otherwise it heads its own system. APPROXIMATE: straight-line distance between area centroids; mountains and roads are not taken into account; actual commuting is not measured.',
       'Каждый район связан с городом, который притягивает его сильнее всего: поток ≈ население × население / расстояние² (метод доминирующего потока). Город подчиняется более крупному в пределах 30 км (любому крупнее), 100 км (не менее чем вдвое крупнее) или 150 км (в 10 раз крупнее); иначе он сам центр системы. ОРИЕНТИРОВОЧНО: расстояние — по прямой между центрами территорий, горы и дороги не учтены, реальные поездки не измерены.'],
    "Shahar tizimi (taxminiy)": ['Urban system (approximate)', 'Городская система (ориентировочно)'],
    "<b>{0}</b> tizimi — markaz": ['Centre of the <b>{0}</b> system', 'Центр системы <b>{0}</b>'],
    "<b>{0}</b> tizimi": ['<b>{0}</b> system', 'Система <b>{0}</b>'],
    "Eng kuchli bog'lanish: {0} · {1} km (to'g'ri chiziq)": ['Strongest link: {0} · {1} km (straight line)', 'Сильнейшая связь: {0} · {1} км (по прямой)'],
    "Zanjir: {0}": ['Chain: {0}', 'Цепочка: {0}'],
    "Tizimlararo: {0} · {1} km": ['Between systems: {0} · {1} km', 'Между системами: {0} · {1} км'],
    "Toshkent shahri tumani — Toshkent tizimi markazida.": ['A district of Tashkent city — at the centre of the Tashkent system.', 'Район города Ташкента — в центре Ташкентской системы.'],
    "Shahar tizimlari, taxminiy": ['Urban systems, approximate', 'Городские системы, ориентировочно'],
  };
  for (var k0 in I18) if (!(k0 in D)) D[k0] = I18[k0];

  var TK = 'Toshkent shahri', R = null;
  var PAL = ['#3ad1e8', '#ff4fa3', '#f3c96b', '#7ee081', '#ff8a3d', '#a78bfa', '#4f8cff', '#e86b6b', '#2fd3a0', '#d9a1ff', '#c9e265', '#ffb3c7', '#7fb0c9', '#e0c08a', '#9ad0ff', '#f59ec9'];
  function cen(g) {
    var ps = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates], A = 0, X = 0, Y = 0;
    ps.forEach(function (poly) { var r = poly[0]; for (var i = 0; i < r.length - 1; i++) { var c = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; A += c; X += (r[i][0] + r[i + 1][0]) * c; Y += (r[i][1] + r[i + 1][1]) * c; } });
    return [X / (3 * A), Y / (3 * A)];
  }
  function km(a, b) { var la = (a[1] + b[1]) / 2 * Math.PI / 180; return Math.hypot((a[0] - b[0]) * 111.32 * Math.cos(la), (a[1] - b[1]) * 110.57); }
  var VAQT = null; // 2-qadam: {from:{to:daqiqa}} — boʻlsa km oʻrniga ishlatiladi (hozircha yoʻq)

  /** Hisob: UZ (197 birlik) → tugunlar, bogʻlanishlar, tizimlar */
  function hisob() {
    if (R) return R;
    if (typeof UZ === 'undefined' || !UZ) return null;
    var N = [], tk = [], by = {};
    UZ.features.forEach(function (f) { var p = f.properties; if (p.r26 == null) return; var c = cen(f.geometry); if (p.v === TK) tk.push([p, c]); else N.push({ n: p.n, P: p.r26, c: c, sh: /shahri/.test(p.n), u: [p.n] }); });
    if (tk.length) { var P = 0, x = 0, y = 0; tk.forEach(function (q) { P += q[0].r26; x += q[1][0] * q[0].r26; y += q[1][1] * q[0].r26; }); N.push({ n: TK, P: P, c: [x / P, y / P], sh: true, u: tk.map(function (q) { return q[0].n; }) }); }
    N.forEach(function (a) { by[a.n] = a; });
    var C = N.filter(function (a) { return a.sh; });
    var dist = function (a, b) { return VAQT && VAQT[a.n] && VAQT[a.n][b.n] != null ? VAQT[a.n][b.n] : km(a.c, b.c); };
    var F = function (a, b) { var d = Math.max(dist(a, b), 10); return a.P * b.P / (d * d); };
    N.forEach(function (a) {
      var tot = 0; N.forEach(function (b) { if (b !== a) tot += F(a, b); });
      var cand, best = null;
      if (a.sh) cand = C.filter(function (b) { if (b === a || b.P <= a.P) return false; var d = dist(a, b); return d <= 30 || (d <= 100 && b.P >= 2 * a.P) || (d <= 150 && b.P >= 10 * a.P); });
      else { cand = C.filter(function (b) { return dist(a, b) <= 120; }); if (!cand.length) cand = [C.reduce(function (m, b) { return !m || dist(a, b) < dist(a, m) ? b : m; }, null)]; }
      cand.forEach(function (b) { var f = F(a, b); if (!best || f > best[0]) best = [f, b]; });
      a.t = best ? best[1] : null; a.d = best ? dist(a, best[1]) : null; a.ul = best && tot ? best[0] / tot * 100 : null;
      if (!a.t) { var up = C.filter(function (b) { return b !== a && b.P > a.P; }), h = null; up.forEach(function (b) { var f = F(a, b); if (!h || f > h[0]) h = [f, b]; }); a.x = h ? h[1] : null; a.xd = h ? dist(a, h[1]) : null; }
    });
    N.forEach(function (a) { var h = a, z = [a], g = 0; while (h.t && g++ < 50) { h = h.t; z.push(h); } a.h = h; a.z = z; });
    var S = {}; N.forEach(function (a) { var s = S[a.h.n] || (S[a.h.n] = { h: a.h, m: [], P: 0 }); s.m.push(a); s.P += a.P; });
    var L = Object.keys(S).map(function (k) { return S[k]; }).sort(function (a, b) { return b.P - a.P; });
    L.forEach(function (s, i) { s.col = PAL[i % PAL.length]; s.i = i; });
    var U = {}; N.forEach(function (a) { a.u.forEach(function (n) { U[n] = a; }); });
    R = { N: N, by: by, S: S, L: L, U: U };
    return R;
  }

  /* ——— xarita ——— */
  var ON = false;
  function qatlamlar() {
    var r = hisob(); if (!r || map.getSource('al-l')) return r;
    var ln = [], xs = [], pts = [];
    r.N.forEach(function (a) {
      var col = r.S[a.h.n].col;
      if (a.t) ln.push({ type: 'Feature', properties: { col: col, w: Math.log10(a.P) - 4 }, geometry: { type: 'LineString', coordinates: [a.c, a.t.c] } });
      if (!a.t && a.x) xs.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [a.c, a.x.c] } });
      if (!a.t) pts.push({ type: 'Feature', properties: { col: col, P: a.h === a ? r.S[a.n].P : a.P }, geometry: { type: 'Point', coordinates: a.c } });
      else if (a.sh) pts.push({ type: 'Feature', properties: { col: col, P: a.P, s: 1 }, geometry: { type: 'Point', coordinates: a.c } });
    });
    var bef = map.getLayer('uz-s0') ? 'uz-s0' : undefined, vis = { visibility: 'none' };
    map.addSource('al-l', { type: 'geojson', data: { type: 'FeatureCollection', features: ln } });
    map.addSource('al-x', { type: 'geojson', data: { type: 'FeatureCollection', features: xs } });
    map.addSource('al-p', { type: 'geojson', data: { type: 'FeatureCollection', features: pts } });
    map.addLayer({ id: 'al-x', type: 'line', source: 'al-x', layout: vis, paint: { 'line-color': '#ffffff', 'line-opacity': 0.45, 'line-width': 1.2, 'line-dasharray': [3, 3] } }, bef);
    map.addLayer({ id: 'al-l0', type: 'line', source: 'al-l', layout: Object.assign({ 'line-cap': 'round' }, vis), paint: { 'line-color': '#04121a', 'line-opacity': 0.55, 'line-width': ['+', 2.2, ['*', 1.3, ['get', 'w']]] } }, bef);
    map.addLayer({ id: 'al-l', type: 'line', source: 'al-l', layout: Object.assign({ 'line-cap': 'round' }, vis), paint: { 'line-color': ['get', 'col'], 'line-width': ['+', 0.8, ['*', 1.3, ['get', 'w']]] } }, bef);
    map.addLayer({ id: 'al-p', type: 'circle', source: 'al-p', layout: vis, paint: { 'circle-color': ['get', 'col'], 'circle-stroke-color': '#04121a', 'circle-stroke-width': 1.5,
      'circle-radius': ['case', ['has', 's'], ['interpolate', ['linear'], ['get', 'P'], 5e4, 2.5, 7e5, 5], ['interpolate', ['linear'], ['get', 'P'], 1e5, 5, 1e7, 13]] } }, bef);
    return r;
  }
  var LAY = ['al-x', 'al-l0', 'al-l', 'al-p'];
  function korinsin(on) { ON = on; if (!map.getSource('al-l')) { if (!on) return; qatlamlar(); } LAY.forEach(function (l) { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', on ? 'visible' : 'none'); }); }
  function rang() { var r = hisob(), e = ['match', ['get', 'n']]; Object.keys(r.U).forEach(function (n) { e.push(n, r.S[r.U[n].h.n].col); }); e.push('#556'); return e; }
  function nom(a) { return T.nom(a.n); }
  function mln(P) { return uzF(P / 1e6, P >= 1e6 ? 1 : 2); }

  function chiz() {
    var r = qatlamlar(); if (!r) return;
    map.setPaintProperty('uz-f', 'fill-color', rang());
    map.setPaintProperty('uz-f', 'fill-opacity', uzV ? ['case', ['==', ['get', 'v'], uzV], 0.62, 0.12] : 0.5);
    document.getElementById('uzi').textContent = T("Har tuman eng kuchli tortadigan shaharga bog'langan: oqim ≈ aholi × aholi / masofa² (dominant oqim usuli). Shahar kattaroq shaharga bo'ysunadi: 30 km gacha — har qanday kattaroqqa, 100 km gacha — kamida 2 barobar kattaga, 150 km gacha — 10 barobar kattaga; aks holda o'zi tizim markazi. TAXMINIY: masofa hudud markazlari orasida to'g'ri chiziq, tog' va yo'llar hisobga olinmagan, haqiqiy qatnov o'lchanmagan.");
    var L = uzV ? r.L.filter(function (s) { return s.m.some(function (a) { return a.u.some(function (n) { var f = UZ.features.find(function (x) { return x.properties.n === n; }); return f && f.properties.v === uzV; }); }); }) : r.L;
    var el = document.getElementById('uzl');
    el.innerHTML = '<div class="k" style="margin-top:0">' + T('Shahar tizimlari · {0} ta', L.length) + '</div>' + L.map(function (s) {
      var n = s.m.reduce(function (a, m) { return a + m.u.length; }, 0);
      return '<div class="bar" data-al="' + s.i + '" style="cursor:pointer"><i style="width:14px;background:' + s.col + '"></i><span style="flex:1">' + nom(s.h) + '</span><span style="color:var(--muted);font-family:var(--mono);font-size:11px">' + T('{0} birlik · {1} mln', n, mln(s.P)) + '</span></div>';
    }).join('');
    el.querySelectorAll('[data-al]').forEach(function (b) { b.onclick = function () { var s = r.L[+b.dataset.al], a = 180, bb = 90, c = -180, d = -90; s.m.forEach(function (m) { m.u.forEach(function (n) { var f = UZ.features.find(function (x) { return x.properties.n === n; }); if (!f) return; a = Math.min(a, f.bb[0][0]); bb = Math.min(bb, f.bb[0][1]); c = Math.max(c, f.bb[1][0]); d = Math.max(d, f.bb[1][1]); }); });
      map.fitBounds([[a, bb], [c, d]], { padding: innerWidth > 900 ? { left: 460, right: 50, top: 100, bottom: 110 } : { left: 16, right: 16, top: 70, bottom: innerHeight * 0.45 }, duration: 1200 }); }; });
    document.getElementById('uzth').textContent = T('Tizimlararo aloqalar');
    var X = r.N.filter(function (a) { return !a.t && a.x; }).sort(function (a, b) { return b.P - a.P; }).slice(0, 8);
    document.getElementById('uzt').innerHTML = X.map(function (a) { return '<button data-n="' + a.u[0].replace(/"/g, '&quot;') + '"' + (a.u.indexOf(uzSel) >= 0 ? ' class="on"' : '') + '>' + nom(a) + ' → ' + nom(a.x) + ' <span style="float:right;font-family:var(--mono)">' + uzN(a.xd) + ' km</span></button>'; }).join('');
    document.querySelectorAll('#uzt button').forEach(function (b) { b.onclick = function () { uzPick(b.dataset.n, true); }; });
  }

  /** Tuman kartasidagi blok */
  function blok(p) {
    var r = hisob(); if (!r || !r.U[p.n]) return '';
    var a = r.U[p.n], s = r.S[a.h.n], h = '<div class="k">' + T('Shahar tizimi (taxminiy)') + '</div><div class="uzx" style="margin-top:2px"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + s.col + ';margin-right:6px;vertical-align:-1px"></i>';
    if (a.n === TK) return h + T('<b>{0}</b> tizimi — markaz', nom(a)) + '<br>' + T('Toshkent shahri tumani — Toshkent tizimi markazida.') + '</div>';
    h += a.h === a ? T('<b>{0}</b> tizimi — markaz', nom(a)) : T('<b>{0}</b> tizimi', nom(a.h));
    if (a.t) h += '<br>' + T("Eng kuchli bog'lanish: {0} · {1} km (to'g'ri chiziq)", nom(a.t), uzN(a.d));
    if (a.z.length > 2) h += '<br>' + T('Zanjir: {0}', a.z.map(nom).join(' → '));
    if (!a.t && a.x) h += '<br>' + T('Tizimlararo: {0} · {1} km', nom(a.x), uzN(a.xd));
    return h + '</div>';
  }

  /* ——— sahifaga ulash ——— */
  function bosh() {
    var s3 = document.getElementById('uzs3'); if (!s3 || document.getElementById('uzs8')) return;
    if (typeof UZM !== 'undefined') UZM.al = { b: [1, 2, 3, 4], c: UZC, l: ['', '', '', '', ''], t: T('Shahar tizimlari'), i: '' };
    var lab = s3.previousElementSibling, k = document.createElement('div'), seg = document.createElement('div');
    k.className = 'k'; k.textContent = T('Aloqalar');
    seg.className = 'seg full sm'; seg.id = 'uzs8'; seg.innerHTML = '<button data-u="al">' + T('Shahar tizimlari') + '</button>';
    s3.parentNode.insertBefore(k, lab); s3.parentNode.insertBefore(seg, lab);
    seg.querySelector('button').onclick = function () { uzK = 'al'; uzDraw(); if (typeof kpi === 'function') kpi(); };
    var d0 = window.uzDraw, v0 = window.uzVis;
    window.uzDraw = function () { d0.apply(this, arguments); var on = uzK === 'al' && typeof UZ !== 'undefined' && !!UZ; seg.querySelector('button').classList.toggle('on', uzK === 'al'); if (on) chiz(); korinsin(on && map.getLayoutProperty('uz-f', 'visibility') === 'visible'); };
    window.uzVis = function (on) { v0.apply(this, arguments); korinsin(!!on && uzK === 'al'); };
  }
  window.YSA = { blok: blok, hisob: hisob, vaqt: function (m) { VAQT = m; R = null; },
    _: { uz: function () { return UZ; }, vis: function () { return map.getLayer('al-l') ? map.getLayoutProperty('al-l', 'visibility') : 'none'; } } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bosh); else bosh();
})();
