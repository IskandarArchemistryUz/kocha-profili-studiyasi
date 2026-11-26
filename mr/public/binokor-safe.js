/* Binokor — xavfsizlik qatlami (0-bosqich, 26.11.2026). Tahlil: claude/binokor-mantiq-tahlili-26-11.md
   Maqsad: foydalanuvchi ishi yoʻqolmasin va tasodifiy harakat modelni buzmasin. Yadro (binokor.html) oʻzgarmaydi —
   bu fayl uning global funksiyalarini oʻraydi, shuning uchun Binokor qayta yigʻilganda ham saqlanadi.
   1) Model toʻliq almashtirilsa (Yangi loyiha, Ochish, Modelga oʻtkazish, namuna, «Hammasini ishga tushirish»)
      oldingi holat (buyruqlar + albom) suratga olinadi; Ctrl+Z uni toʻliq qaytaradi, Ctrl+Y — qayta qoʻllaydi.
   2) Modelda element boʻlsa, almashtiruvchi tugmalar tasdiq soʻraydi. Boʻsh parametrik graf modelga oʻtkazilmaydi.
   3) Toʻliq bajarilmagan buyruq jurnalga yozilmaydi; xabar oddiy tilda.
   4) Rejada 6 px dan kichik sudrash — surish emas, tanlash. 3D da sudrab surish yoʻq: «Surish» asbobi (D). */
(function () {
  'use strict';
  if (typeof rebuild !== 'function' || typeof push !== 'function' || typeof undo !== 'function') return;
  var $id = function (i) { return document.getElementById(i); };
  var sig = function (c) { return c.length + '\u0001' + c.join('\n'); };
  var chzStr = function () { try { return JSON.stringify(CHZ); } catch (e) { return null; } };
  var elCount = function () { return M && M.el ? M.el.length : 0; };

  /* ---------- 1. Holat suratlari: toʻliq almashtirishni bekor qilish */
  var BACK = [], FWD = [], MAXS = 20, skip = false;
  var prev = CMDS.slice(), prevChz = chzStr();
  var incremental = function (a, b) {            /* b — a ga qoʻshish (push/redo) yoki oxirgi bitta qatorni olish (undo) */
    var n = Math.min(a.length, b.length); for (var i = 0; i < n; i++) if (a[i] !== b[i]) return false;
    return b.length >= a.length || b.length === a.length - 1;
  };
  var _rebuild = rebuild;
  rebuild = function () {
    if (!skip && prev.length && !incremental(prev, CMDS)) {
      BACK.push({ cmds: prev, chz: prevChz, after: sig(CMDS) }); if (BACK.length > MAXS) BACK.shift(); FWD.length = 0;
    }
    skip = false;
    var r = _rebuild.apply(this, arguments);
    prev = CMDS.slice(); prevChz = chzStr();
    return r;
  };
  var restore = function (s) {
    skip = true; CMDS = s.cmds.slice(); REDO = [];
    if (s.chz) { try { CHZ = JSON.parse(s.chz); CHCUR = 0; CHSEL = null; if (typeof chzSave === 'function') chzSave(); } catch (e) {} }
    rebuild(); if (typeof fit === 'function') fit();
  };
  var _undo = undo, _redo = redo;
  undo = function () {
    var t = BACK[BACK.length - 1];
    if (t && t.after === sig(CMDS)) { BACK.pop(); FWD.push({ cmds: CMDS.slice(), chz: chzStr(), after: sig(t.cmds) }); restore(t); toast('Oldingi model qaytarildi', 1); return; }
    _undo();
  };
  redo = function () {
    var t = FWD[FWD.length - 1];
    if (t && t.after === sig(CMDS) && !REDO.length) { FWD.pop(); BACK.push({ cmds: CMDS.slice(), chz: chzStr(), after: sig(t.cmds) }); restore(t); return; }
    _redo();
  };
  if ($id('bUndo')) $id('bUndo').onclick = function () { undo(); };
  if ($id('bRedo')) $id('bRedo').onclick = function () { redo(); };
  /* menyu va boshqa joylar eski undo/redo ga havola saqlagan boʻlishi mumkin — klaviatura va tugmalarni shu yerda ushlaymiz */
  window.addEventListener('keydown', function (ev) {
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
    var t = ev.target, k = ev.key; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (typeof MODE !== 'undefined' && MODE === 'chizma') return;            /* Chizmadonning oʻz tarixi bor */
    var z = k === 'z' || k === 'Z', y = k === 'y' || k === 'Y'; if (!z && !y) return;
    var back = z && !ev.shiftKey, top = back ? BACK[BACK.length - 1] : FWD[FWD.length - 1];
    if (top && top.after === sig(CMDS) && (back || !REDO.length)) { ev.preventDefault(); ev.stopImmediatePropagation(); back ? undo() : redo(); }
  }, true);

  /* ---------- 2. Tasdiq oynasi (Lab uslubida, native confirm emas) */
  var ask = function (title, text, okLabel, onOk) {
    var w = document.createElement('div'); w.className = 'bks-ov';
    w.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(20,16,18,.28);display:flex;align-items:center;justify-content:center';
    w.innerHTML = '<div role="dialog" aria-modal="true" style="background:var(--sf,#fff);color:var(--ink,#141414);border-radius:16px;padding:18px 18px 14px;width:min(380px,calc(100vw - 32px));box-shadow:0 0 0 .5px rgba(0,0,0,.08),0 24px 64px rgba(0,0,0,.22);font-size:13px;line-height:1.45">'
      + '<div style="font-weight:700;font-size:14.5px;margin-bottom:6px"></div><div style="color:var(--ink2,#444)"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button type="button" class="btn" data-a="no">Bekor qilish</button><button type="button" class="btn p" data-a="ok"></button></div></div>';
    var box = w.firstChild; box.children[0].textContent = title; box.children[1].textContent = text;
    var ok = box.querySelector('[data-a="ok"]'); ok.textContent = okLabel;
    var close = function () { document.removeEventListener('keydown', key, true); w.remove(); };
    var key = function (e) { e.stopImmediatePropagation(); if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'Enter') { e.preventDefault(); close(); onOk(); } };
    document.addEventListener('keydown', key, true);
    w.addEventListener('mousedown', function (e) { if (e.target === w) close(); });
    box.querySelector('[data-a="no"]').onclick = close; ok.onclick = function () { close(); onOk(); };
    document.body.appendChild(w); ok.focus();
  };
  var GUARD = '#bNew, #ghbake, #runAll, button[data-s]';
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest(GUARD); if (!b) return;
    if (b._bksOk) { b._bksOk = false; return; }
    var bake = b.id === 'ghbake';
    if (bake && typeof GHcmd !== 'undefined' && !(GHcmd && GHcmd.length)) {
      ev.preventDefault(); ev.stopImmediatePropagation();
      toast('Parametrik grafda natija yoʻq — tugunlarni «Binokor ⟶ model» ga ulang yoki namunani tanlang'); return;
    }
    var n = elCount(); if (!n) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    ask(bake ? 'Joriy model almashtiriladi' : b.id === 'bNew' ? 'Yangi loyiha boshlansinmi?' : 'Joriy model almashtiriladi',
      'Modelda ' + n + ' ta element bor. Ular oʻrniga ' + (bake ? 'parametrik natija' : b.id === 'bNew' ? 'boʻsh loyiha' : 'yangi model') + ' qoʻyiladi. Ctrl+Z bilan qaytarish mumkin.',
      b.id === 'bNew' ? 'Yangi loyiha' : 'Almashtirish', function () { b._bksOk = true; b.click(); });
  }, true);

  /* ---------- 3. Bajarilmagan buyruq jurnalda qolmaydi; xabar oddiy tilda */
  var human = function (m) {
    var s = String(m), x;
    if ((x = s.match(/^Qulflangan: (\S+) \(avval unlock \S+\)$/))) return x[1] + ' qulflangan — avval qulfni oching (L)';
    return s;
  };
  var _toast = toast; toast = function (m, ok) { return _toast(ok ? m : human(m), ok); };
  var bad = function () { var n = 0; for (var i = 0; i < OUT.length; i++) if (!OUT[i].ok) n++; return n; };
  var parts = function (c) { return String(c).replace(/#.*/, '').split(';').filter(function (x) { return x.trim(); }).length; };
  var _push = push;
  push = function () {
    var n0 = CMDS.length, b0 = bad(), r0 = REDO;
    var r = _push.apply(this, arguments);
    if (CMDS.length > n0) {
      var k = 0; for (var i = n0; i < CMDS.length; i++) k += parts(CMDS[i]);
      if (k && bad() - b0 >= k) { CMDS.length = n0; REDO = r0; skip = true; rebuild(true); }   /* hech bir qismi bajarilmadi — jurnaldan olinadi */
    }
    return r;
  };

  /* ---------- 4. Tasodifiy sudrash */
  var st = $id('stage'), dn = null, told = false;
  if (st) {
    st.addEventListener('mousedown', function (ev) {
      dn = { x: ev.clientX, y: ev.clientY };
      /* 3D: yadro element ustida bosilganda sudrab surishni boshlaydi — bekor qilamiz (tanlov qoladi). Surish — D yoki «Surish» tugmasi. */
      if (typeof VIEW !== 'undefined' && VIEW === '3d' && ev.button === 0 && M3 && M3.drag) { M3 = null; dn.el3 = true; }
    });
    window.addEventListener('mousemove', function (ev) {
      if (dn && dn.el3 && !told && (ev.buttons & 1) && Math.hypot(ev.clientX - dn.x, ev.clientY - dn.y) > 12) { told = true; toast('3D da surish: D tugmasi yoki «Surish» asbobi — tayanch nuqta, keyin yangi joy', 1); }
    }, true);
    window.addEventListener('mouseup', function (ev) {
      var d = dn; dn = null; if (!d || typeof DRAG === 'undefined' || !DRAG) return;
      if ((DRAG.kind === 'move' || DRAG.kind === 'end' || DRAG.kind === 'grid') && !(typeof TYPED !== 'undefined' && TYPED) && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 6) DRAG.d = null;
    }, true);
  }
})();
