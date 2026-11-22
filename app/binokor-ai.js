/* Binokor AI (15.11.2026, 2-bosqich) — bitta «AI» paneli, Lab serveri orqali (api.archemistry.uz /agent/*).
   Kanvas maketi: «Binokor AI — maket», reja: claude/binokor-ai-reja-15-11.md.
   Qanday ishlaydi:
   - Model chaqiruvi serverda (markaziy kalit, tanga, chegaralar). Buyruqlar shu yerda, brauzerda bajariladi:
     binokor_model / binokor_language / binokor_checks / binokor_selection — faqat o'qish;
     binokor_try — taklif qilingan buyruq qatorlarini build() bilan SINAYDI, modelni o'zgartirmaydi.
   - Javobdan keyin oxirgi xatosiz sinov sahnada OLDINDAN KO'RINADI (yangi elementlar tanlangan holda).
     «Qo'llash» — bitta qadam (Ctrl+Z bir bosishda qaytaradi), «Bekor» — avvalgi holat.
   - Buyruq nomlari server/src/agent-tools.js dagi BK ro'yxati bilan bir xil bo'lishi shart.
   Binokor yadrosiga tegmaydi: globallardan foydalanadi (CMDS, REDO, M, A, OUT, LV, SEL, UL, build, rebuild,
   modelBrief, DSL_REF, ulConvert, agentClean, toast). Server Binokorni yoqmagan bo'lsa — AI tugmasi chiqmaydi. */
(function () {
  'use strict';
  var d = document;
  if (typeof build !== 'function' || typeof DSL_REF !== 'string') return;
  var ls = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var API = function () { var h = location.hostname; return (h === 'localhost' || h === '127.0.0.1' ? ls('kps_api') : null) || 'https://api.archemistry.uz'; };   /* 22.11: kps_api faqat localhost da */
  var LANG = function () { var l = ls('mr-lang') || ls('kps_lang') || 'uz'; return /^(uz|en|ru|es|pt|fr|az|uk|tr|kk)$/.test(l) ? l : 'uz'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var m3 = function (v) { return Math.round(v) / 1000; };
  var MAXR = 30000;
  var enc = function (v) { var s; try { s = JSON.stringify(v == null ? null : v); } catch (e) { s = '"natija JSON ga oʻgirilmadi"'; } return s.length > MAXR ? s.slice(0, MAXR) + '…(qisqartirildi)' : s; };
  var CAT = { wall: 'devor', column: 'ustun', beam: 'toʻsin', slab: 'yopma', hole: 'teshik', window: 'deraza', door: 'eshik', stair: 'zina', zone: 'xona', footing: 'poydevor', roof: 'tom', balcony: 'balkon', dim: 'oʻlcham', text: 'matn', line: 'chiziq' };

  var AI = { cfg: null, mode: 'edit', imgs: [], ul: false, ulk: 1, ulMmpx: 0, busy: false, ctl: null, hist: [], prop: null, prev: null, lastRun: null };

  /* ——— server ——— */
  function call(path, body, signal) {
    return fetch(API() + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', signal: signal,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .catch(function (e) { if (e && e.name === 'AbortError') throw e; var er = new Error('Server bilan aloqa yoʻq. Internetni tekshiring.'); er.code = 'offline'; throw er; })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var er = new Error(j.message || 'Server xatosi'); er.code = j.error || 'server'; er.status = r.status; er.need = j.need; throw er; } return j; }); });
  }

  /* ——— buyruqlar (brauzerda) ——— */
  function levelRooms(AA) { var o = {}; Object.keys(AA.levels || {}).forEach(function (k) { o[k] = (AA.levels[k].rooms || []).length; }); return o; }
  function counts(MM) { var o = {}; (MM.el || []).forEach(function (e) { o[e.cat] = (o[e.cat] || 0) + 1; }); return o; }
  function failSet(AA) { return (AA.checks || []).filter(function (c) { return c.status === 'FAIL'; }); }
  function planGuide() {
    var mm = AI.ulMmpx.toFixed(3), L = LV;
    return '\n\nREADING THE ATTACHED UNDERLAY IMAGE (mode "image")\nIMAGE: ' + AI.ulW + ' × ' + AI.ulH + ' px, origin top-left, x to the right, y DOWN. Scale: 1 px = ' + mm + ' mm (' + (AI.ulCal ? 'calibrated by the architect' : 'NOT calibrated — rough guess; say so') + ').\n'
      + 'In binokor_try use coords="image" and write EVERY point as P(x,y) in IMAGE PIXELS (decimals allowed) — never metres. A length along a wall may be written as S(px). Heights, thicknesses and type sizes stay as usual.\n'
      + '1. Grid: if axis bubbles are drawn, add each axis:  grid add NAME P(x,y) ANGLE  (90 for vertical axes 1,2,3…, 0 for horizontal axes А,Б,В…).\n'
      + '2. OUTER PERIMETER FIRST, as ONE closed chain that ends on its first point: wall TYPE P(a) P(b) P(c) … P(a) ref=c ' + L + '. Glazed parts of the facade are walls too: type V60 (glass wall), so the perimeter is closed. Split the chain where the type changes, reusing the same corner points.\n'
      + '3. Interior walls: centre line of each wall. Every end must touch another wall (the SAME P(...) or a point ON another wall centre line). A wall never stops at a door or window: draw it through; the opening is added separately.\n'
      + '4. Thickness = dark band across the wall in px × ' + mm + ' mm. Types: T400 (≈380–500 mm), M200 (≈180–260), P120 (≈90–150), V60 (glass, ≈20–80). Other thickness: define once: walltype K300 bearing Temirbeton:300:1.69 (≥180 mm bearing, else partition Gazoblok:100:0.14).\n'
      + '5. Openings: every door (gap + swing arc) and window: one line each at its CENTRE on the wall centre line: door TYPE P(x,y) ' + L + ' / window TYPE P(x,y) ' + L + '. Types by drawn width (D07 700, D08 800, D10 1000; O09 900, O15 1500, O21 2100); other widths: wintype / doortype first.\n'
      + '6. Use written dimension strings (mm) to correct pixel estimates: distance between two P points × ' + mm + ' must equal the written dimension.\n'
      + '7. Stairs if clear: stair P(c1) P(c2) type=u|i|l ' + L + '. Room names: zone P(x,y) Name_with_underscores ' + L + ' well inside the room.\n'
      + '8. Count the enclosed rooms you see and pass it as "rooms" to binokor_try; Binokor compares it with the rooms your walls close.\n'
      + 'After each try Binokor snaps your lines to the drawing (wall centre and thickness from ink, right angles, shared corners, T-junctions), so focus on every wall, topology and every opening; ±2 px errors are fine.';
  }
  function selTypes(ids) {
    var o = {}; ids.forEach(function (id) { var e = M.el.find(function (q) { return q.id === id; }); if (!e || !e.type || o[e.type]) return; var ty = (M.types && M.types[e.type]) || (typeof TYPES === 'object' && TYPES[e.type]); if (ty) { try { var s = JSON.stringify(ty); if (s.length < 800) o[e.type] = JSON.parse(s); } catch (x) {} } });
    return o;
  }
  var TOOLS = {
    binokor_model: function () {
      var u = UL && UL[LV];
      var brief = modelBrief(); if (brief.length > 24000) brief = brief.slice(0, 24000) + '\n…(qisqartirildi)';
      var cs = A.checks || [], st = {}; cs.forEach(function (c) { st[c.status] = (st[c.status] || 0) + 1; });
      return {
        units: 'metres', current_level: LV, next_id_number: M.seq,
        levels: M.levels.map(function (l) { return { id: l.id, name: l.name, z_m: m3(l.z), h_m: m3(l.h) }; }),
        axes: M.grids.length, elements: counts(M), rooms_per_level: levelRooms(A), checks: st,
        selected: Array.from(SEL).slice(0, 60),
        underlay: u ? { level: LV, attached_to_request: !!AI.ulNow, image_px: [u.w, u.h], mm_per_px: +(+u.s).toFixed(3), calibrated: !!u.cal } : null,
        model: brief,
      };
    },
    binokor_language: function (inp) { return DSL_REF + (inp && inp.mode === 'image' && AI.ulNow ? planGuide() : ''); },
    binokor_checks: function (inp) {
      var s = inp && inp.status && inp.status !== 'ALL' ? inp.status : null;
      var cs = (A.checks || []).filter(function (c) { return !s || c.status === s; });
      return { total: cs.length, items: cs.slice(0, 120).map(function (c) { return { id: c.id, status: c.status, msg: c.msg, source: c.src || null }; }) };
    },
    binokor_references: function () {
      if (!AI.sent || !AI.sent.length) return { attached: 0, note: 'no reference images are attached to this request' };
      return { attached: AI.sent.length, items: AI.sent };
    },
    binokor_selection: function () {
      var ids = Array.from(SEL).slice(0, 40);
      if (!ids.length) return { selected: 0, note: 'nothing is selected' };
      return { selected: SEL.size, units: 'mm', types: selTypes(ids), items: ids.map(function (id) { var e = M.el.find(function (q) { return q.id === id; }); if (!e) return { id: id }; var o = {}; Object.keys(e).forEach(function (k) { var v = e[k]; if (v == null || typeof v === 'function') return; var s = JSON.stringify(v); if (s && s.length < 600) o[k] = v; }); return o; }) };
    },
    binokor_try: async function (inp) {
      var lines = (Array.isArray(inp.lines) ? inp.lines : []).map(function (s) { return String(s).trim(); }).filter(Boolean);
      if (!lines.length) throw new Error('no lines');
      var replace = !!inp.replace || lines.slice(0, 3).some(function (l) { return /^#\s*REPLACE/i.test(l); });
      var info = null;
      if (inp.coords === 'image') {
        var u = UL[LV]; if (!u || !AI.ulNow) throw new Error('no underlay image is attached to this request — use coords "model"');
        var cl = await agentClean(ulConvert(lines.join('\n'), u, AI.ulk), u); lines = cl.text.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); info = cl.info;
      }
      lines = lines.filter(function (l) { return !/^#\s*REPLACE/i.test(l); });
      var next = replace ? lines : CMDS.concat(lines);
      var r = build(next);
      var bad = r.out.slice(replace ? 0 : OUT.length).filter(function (o) { return !o.ok; });
      var c0 = counts(M), c1 = counts(r.M), add = {}, rem = {};
      Object.keys(c1).forEach(function (k) { var dlt = c1[k] - (replace ? 0 : (c0[k] || 0)); if (dlt > 0) add[k] = dlt; });
      if (!replace) Object.keys(c0).forEach(function (k) { var dlt = (c0[k] || 0) - (c1[k] || 0); if (dlt > 0) rem[k] = dlt; });
      var chg = []; if (!replace) { var before = {}; M.el.forEach(function (e) { before[e.id] = JSON.stringify(e); }); r.M.el.forEach(function (e) { if (before[e.id] && before[e.id] !== JSON.stringify(e)) chg.push(e.id); }); }
      var f0 = failSet(A), f1 = failSet(r.A), k0 = new Set(f0.map(function (c) { return c.id + '|' + c.msg; }));
      var nf = f1.filter(function (c) { return !k0.has(c.id + '|' + c.msg); });
      var rb = levelRooms(A), ra = levelRooms(r.A), lvl = LV, roomsNew = (ra[lvl] || 0) - (replace ? 0 : (rb[lvl] || 0));
      var res = {
        ok: !bad.length, commands: lines.filter(function (l) { return !/^#/.test(l); }).length, failed_count: bad.length,
        failed: bad.slice(0, 15).map(function (o) { return { line: o.line, error: o.err }; }),
        added: add, removed: rem, changed: chg.length, changed_ids: chg.slice(0, 40), levels_after: r.M.levels.map(function (l) { return l.id; }),
        rooms_on_current_level: { before: replace ? 0 : (rb[lvl] || 0), after: ra[lvl] || 0 },
        fail_checks: { before: f0.length, after: f1.length }, new_fails: nf.slice(0, 8).map(function (c) { return c.id + ': ' + c.msg; }),
      };
      if (isFinite(inp.rooms)) res.rooms_expected = inp.rooms, res.rooms_closed = roomsNew;
      if (info) res.snapped_to_drawing = { by_ink: info.ink, retyped: info.retype, right_angles: info.ortho, corners: info.nodes, t_junctions: info.tee, walls_without_ink: (info.noInk || []).length };
      AI.tries++;
      if (!bad.length) {
        AI.prop = { lines: lines, replace: replace, next: next, summary: String(inp.summary || ''), add: add, rem: rem, chg: chg, f0: f0.length, f1: f1.length, nf: nf.length, rooms: res.rooms_expected != null ? [res.rooms_closed, res.rooms_expected] : null, info: info };
        res.preview = 'this try will be shown to the user as the preview';
      } else res.preview = 'not shown — fix the failed lines';
      return res;
    },
    get_norm_clause: function (inp) { return call('/agent/clause?doc=' + encodeURIComponent(inp.doc || '') + '&clause=' + encodeURIComponent(inp.clause || '')); },
  };

  /* ——— sikl ——— */
  async function loop(o) {
    var run = await call('/agent/run', { scenario: o.scenario }, o.signal);
    AI.lastRun = run; o.onRun && o.onRun(run);
    var msgs = [];
    AI.hist.slice(-2).forEach(function (h) { msgs.push({ role: 'user', content: h.q }); msgs.push({ role: 'assistant', content: h.a }); });
    var first = o.parts.slice();
    first.push({ type: 'text', text: o.question });
    msgs.push({ role: 'user', content: first });
    var text = '';
    for (;;) {
      if (o.signal.aborted) return { text: text, status: 'stopped' };
      var r = await call('/agent/step', { run: run.run, messages: msgs, lang: LANG() }, o.signal);
      var keep = r.content.filter(function (b) { return b.type !== 'text' || b.text.trim(); });
      msgs.push({ role: 'assistant', content: keep.length ? keep : [{ type: 'text', text: '…' }] });
      var t = r.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n\n').trim();
      if (t) text = t;
      var calls = r.content.filter(function (b) { return b.type === 'tool_use'; });
      if (r.stop !== 'tool_use' || !calls.length) return { text: text, status: 'done', unsourced: r.unsourced, cut: r.stop === 'max_tokens' };
      if (r.status !== 'open' || r.stepsLeft <= 0) return { text: text, status: 'limit' };
      var results = [];
      for (var i = 0; i < calls.length; i++) {
        var c = calls[i]; o.onTool && o.onTool(c.name);
        try {
          var fn = TOOLS[c.name]; if (!fn) throw new Error('unknown tool ' + c.name);
          results.push({ type: 'tool_result', tool_use_id: c.id, content: enc(await fn(c.input || {})) });
        } catch (e) { results.push({ type: 'tool_result', tool_use_id: c.id, content: enc({ error: (e && e.message) || String(e) }), is_error: true }); }
      }
      msgs.push({ role: 'user', content: results });
    }
  }

  /* ——— rasm ——— */
  function toJpeg(src, maxPx) {
    return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = no; im.src = src; }).then(function (im) {
      var w = im.naturalWidth, h = im.naturalHeight, tries = [[maxPx, 0.86], [1200, 0.8], [900, 0.75]];
      for (var i = 0; i < tries.length; i++) {
        var k = Math.min(1, tries[i][0] / Math.max(w, h)), cw = Math.round(w * k), ch = Math.round(h * k), c = d.createElement('canvas'); c.width = cw; c.height = ch;
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); x.drawImage(im, 0, 0, cw, ch);
        var b64 = c.toDataURL('image/jpeg', tries[i][1]).split(',')[1];
        if (b64.length <= 1350000) return { b64: b64, k: k, w: cw, h: ch };
      }
      throw new Error('rasm juda katta');
    });
  }

  /* ——— oldindan ko'rinish ——— */
  function key() { return CMDS.length + '|' + CMDS[CMDS.length - 1]; }
  function previewShow() {
    var p = AI.prop; if (!p) return;
    var ids0 = new Set(M.el.map(function (e) { return e.id; }));
    AI.prev = { cmds: CMDS.slice(), redo: REDO.slice(), replace: p.replace, joined: p.lines.filter(function (l) { return !/^#/.test(l); }).join('; ') };
    CMDS = p.replace ? p.next.slice() : AI.prev.cmds.concat([AI.prev.joined]);
    rebuild(true); if (p.replace && typeof fit === 'function') fit();
    SEL.clear(); if (!p.replace) { M.el.forEach(function (e) { if (!ids0.has(e.id)) SEL.add(e.id); }); (p.chg || []).forEach(function (id) { SEL.add(id); }); }
    render();
    AI.prev.key = key();
    pill(true);
  }
  function previewEnd(apply) {
    var pv = AI.prev; if (!pv) return; AI.prev = null; pill(false);
    if (apply) {
      REDO = []; if (pv.replace) AI.restore = { cmds: pv.cmds }; toast(pv.replace ? t('Yangi model qoʻllandi · eski modelni AI panelidan qaytarish mumkin') : t('Qoʻllandi · Ctrl+Z bir bosishda qaytaradi'), true);
    } else if (key() === pv.key) { CMDS = pv.cmds; REDO = pv.redo; SEL.clear(); rebuild(true); }
    else { apply = true; toast(t('Model oldindan koʻrinish paytida oʻzgardi — taklif modelda qoldi, Ctrl+Z bilan qaytaring')); }
    var c = d.querySelector('#aiLog .ai-card.live'); if (c) { c.classList.remove('live'); c.querySelector('.ai-acts').innerHTML = '<span class="ai-done">' + esc(apply ? t('Qoʻllandi') : t('Bekor qilindi')) + '</span>' + (apply && pv.replace ? ' <button type="button" class="ai-btn ai-undo">' + esc(t('Eski modelni qaytarish')) + '</button>' : ''); var ub = c.querySelector('.ai-undo'); if (ub) ub.onclick = function () { if (!AI.restore) return; CMDS = AI.restore.cmds; REDO = []; AI.restore = null; rebuild(); if (typeof fit === 'function') fit(); ub.remove(); toast(t('Eski model qaytarildi'), true); }; }
  }
  function pill(on) {
    var el = d.getElementById('aiPill');
    if (!on) { if (el) el.remove(); return; }
    if (el) return; var host = d.querySelector('#m-model>.center') || d.body;
    el = d.createElement('div'); el.id = 'aiPill'; el.innerHTML = '<i></i><span>' + esc(t('Oldindan koʻrinish — hali qoʻllanmagan')) + '</span><button type="button" class="ai-btn" data-a="no">' + esc(t('Bekor')) + '</button><button type="button" class="ai-btn p" data-a="ok">' + esc(t('Qoʻllash')) + '</button>';
    el.querySelector('[data-a=ok]').onclick = function () { previewEnd(true); }; el.querySelector('[data-a=no]').onclick = function () { previewEnd(false); };
    host.appendChild(el);
  }

  /* ——— matn: interfeys tarjimasi binokor-i18n.js lug'atidan (binokor-lab.js DOM qatlami ham tarjima qiladi) ——— */
  function t(s) { var L = LANG(); if (L === 'uz') return s; var D = window.BINOKOR_I18N || {}, v = D[s]; if (!v) return s; return L === 'ru' ? v[1] : v[0]; }
  function md(s) {
    var h = esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return h.split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  var STEPN = { binokor_references: "Referenslarni ko\u02bbryapti", binokor_model: 'Modelni oʻqiyapti', binokor_language: 'Buyruq tilini koʻryapti', binokor_checks: 'Tekshiruvlarni koʻryapti', binokor_selection: 'Tanlanganni koʻryapti', binokor_try: 'Buyruqlarni sinayapti', get_norm_clause: 'Norma bandini oʻqiyapti' };

  /* ——— panel ——— */
  var IC = {
    ai: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.6L18.5 9.4l-4.7 1.8L12 16l-1.8-4.8L5.5 9.4l4.7-1.8z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    img: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  };
  var Q = ['Tayanch chizmadan model koʻtar', 'Modelni tekshir — nima FAIL va qanday tuzataman?', 'Janubiy fasadga har oʻq oraligʻiga 2 tadan deraza qoʻy', 'Binoga yana 2 qavat qoʻsh'];


  /* ——— referenslar to'plami (3-bosqich): IndexedDB «binokor-ai» → refs. Har biri: turi, tegi, so'rovga yuborish belgisi ——— */
  var MAXIMG = 6, O = '\u02bb';
  // turi: [o'zbekcha nomi, modelga inglizcha nomi]
  var KIND = { reja: ['Reja', 'plan'], kesim: ['Kesim', 'section'], fasad: ['Fasad', 'facade'], foto: ['Foto', 'photo'], matn: ['Matn', 'text page'] };
  var TAGPH = { reja: 'L1 · L2–L8', kesim: '1–1', fasad: 'janub · shimol', foto: '', matn: '' };
  AI.refs = [];
  var dbP = null;
  function idb() { if (!dbP) dbP = new Promise(function (ok, no) { var r = indexedDB.open('binokor-ai', 1); r.onupgradeneeded = function () { r.result.createObjectStore('refs', { keyPath: 'id' }); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; }); return dbP; }
  function store(mode) { return idb().then(function (db) { return db.transaction('refs', mode).objectStore('refs'); }); }
  function rq(r) { return new Promise(function (ok, no) { r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; }); }
  function refsLoad() { return store('readonly').then(function (s) { return rq(s.getAll()); }).then(function (a) { AI.refs = (a || []).sort(function (x, y) { return x.t - y.t; }); }).catch(function () { AI.refs = []; }); }
  function refPut(r) { return store('readwrite').then(function (s) { return rq(s.put(r)); }).catch(function () { toast(t('Referensni brauzer xotirasiga saqlab bo' + O + 'lmadi')); }); }
  function refDel(id) { return store('readwrite').then(function (s) { return rq(s.delete(id)); }).catch(function () {}); }
  function guess(n) { n = n.toLowerCase(); return /fasad|facade|фасад|elev/.test(n) ? 'fasad' : /kesim|razrez|разрез|section|sect/.test(n) ? 'kesim' : /reja|plan|план|etaj|этаж|qavat|floor/.test(n) ? 'reja' : /tz|zadanie|задани|brief|txt/.test(n) ? 'matn' : 'foto'; }
  function guessTag(n, k) { var m; if (k === 'kesim' && (m = n.match(/(\d)\s*[-–_]\s*(\d)/))) return m[1] + '–' + m[2]; if (k === 'fasad') { if (/jan|south|юж/i.test(n)) return 'janub'; if (/shim|north|сев/i.test(n)) return 'shimol'; if (/shar|east|вост/i.test(n)) return 'sharq'; if (/g.arb|west|зап/i.test(n)) return 'g' + O + 'arb'; } if (k === 'reja' && (m = n.match(/(\d+)\s*[-_ ]?\s*(qavat|etaj|этаж|floor|fl)/i))) return 'L' + m[1]; return ''; }
  var pdfP = null;
  function pdfjs() { if (!pdfP) pdfP = new Promise(function (ok, no) { var sc = d.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'; sc.onload = function () { var L = window.pdfjsLib; L.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'; ok(L); }; sc.onerror = function () { pdfP = null; no(new Error('pdf.js')); }; d.head.appendChild(sc); }); return pdfP; }
  async function addRef(src, name) {
    var k = guess(name), a = await toJpeg(src, 1400), hi = await toJpeg(src, 2400);
    var r = { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), name: name, kind: k, tag: guessTag(name, k), note: '', use: AI.refs.filter(function (x) { return x.use; }).length < MAXIMG, b64: a.b64, w: a.w, h: a.h, hi: 'data:image/jpeg;base64,' + hi.b64, hw: hi.w, hh: hi.h };
    AI.refs.push(r); await refPut(r); return r;
  }
  async function ingest(files) {
    var box = d.getElementById('aiRefsBusy'); if (box) box.hidden = false;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      try {
        if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
          var L = await pdfjs(), doc = await L.getDocument({ data: await f.arrayBuffer() }).promise, n = Math.min(doc.numPages, 12);
          if (doc.numPages > 12) toast(t('PDF dan birinchi 12 sahifa olindi'));
          for (var pg = 1; pg <= n; pg++) {
            var page = await doc.getPage(pg), v0 = page.getViewport({ scale: 1 }), sc = Math.min(4, 2400 / Math.max(v0.width, v0.height)), v = page.getViewport({ scale: sc });
            var c = d.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
            await page.render({ canvasContext: x, viewport: v }).promise;
            await addRef(c.toDataURL('image/jpeg', 0.9), f.name.replace(/\.pdf$/i, '') + (n > 1 ? ' · ' + pg : ''));
          }
        } else if (/^image\//.test(f.type)) { var u = URL.createObjectURL(f); await addRef(u, f.name); URL.revokeObjectURL(u); }
      } catch (e) { toast(t('Faylni o' + O + 'qib bo' + O + 'lmadi') + ': ' + f.name); }
      refsRender();
    }
    if (box) box.hidden = true;
  }
  function toUnderlay(r) {
    // Binokorning «Rasm yuklash» mantig'i (ulFile) bilan bir xil: joriy qavatga, ekran markaziga, masshtab berilmagan
    var rc = cv(), cx = (rc.width / 2 - VT.ox) / VT.s, cy = (rc.height / 2 - VT.oy) / VT.s, s0 = 30000 / r.hw;
    UL[LV] = { src: r.hi, w: r.hw, h: r.hh, s: s0, x: Math.round(cx - r.hw * s0 / 2), y: Math.round(cy - r.hh * s0 / 2), rot: 0, op: 0.55, show: 1, name: r.name, cal: 0 };
    ulSave(); ulPanel(); ulFit(); syncUl();
    toast(t('Tayanch chizma qo' + O + 'yildi. Endi «Masshtab: 2 nuqta» — rasmdagi ma' + '’' + 'lum o' + O + 'lchamni bosing'), true);
  }
  function refsCount() { var n = AI.refs.filter(function (r) { return r.use; }).length, el = d.getElementById('aiRefN'); if (el) el.textContent = AI.refs.length ? ' ' + n + '/' + AI.refs.length : ''; var ch = d.getElementById('aiRefChip'); if (ch) { ch.hidden = !n || AI.mode === 'ask'; ch.querySelector('span').textContent = t('Referenslar') + ': ' + n; } }
  function refsRender() {
    var box = d.getElementById('aiRefList'); if (!box) return;
    box.innerHTML = AI.refs.map(function (r) {
      return '<div class="ai-ref" data-id="' + r.id + '"><img class="ai-th" alt="" src="data:image/jpeg;base64,' + r.b64 + '">'
        + '<div class="ai-rm"><input class="ai-rn" value="' + esc(r.name) + '" aria-label="' + esc(t('Nomi')) + '">'
        + '<div class="ai-rr"><select class="ai-rk" aria-label="' + esc(t('Turi')) + '">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '"' + (k === r.kind ? ' selected' : '') + '>' + esc(t(KIND[k][0])) + '</option>'; }).join('') + '</select>'
        + '<input class="ai-rt" value="' + esc(r.tag || '') + '" placeholder="' + esc(TAGPH[r.kind] || '') + '" aria-label="' + esc(t('Qavat, kesim yoki tomon')) + '"></div>'
        + '<input class="ai-rs" value="' + esc(r.note || '') + '" placeholder="' + esc(t('Masshtab, izoh: 1:100…')) + '" aria-label="' + esc(t('Masshtab yoki izoh')) + '"></div>'
        + '<div class="ai-rc"><label class="ai-use" title="' + esc(t('So' + O + 'rovga yuborish')) + '"><input type="checkbox" class="ai-ru"' + (r.use ? ' checked' : '') + '><span>' + esc(t('Yuborish')) + '</span></label>'
        + (r.kind === 'reja' ? '<button type="button" class="ai-btn ai-sm ai-rul" title="' + esc(t('Joriy qavatga tayanch chizma qilib qo' + O + 'yish')) + '">' + esc(t('Sahnaga')) + '</button>' : '')
        + '<button type="button" class="ai-ib ai-rd" aria-label="' + esc(t('O' + O + 'chirish')) + '">' + IC.x + '</button></div></div>';
    }).join('') || '<div class="ai-empty">' + esc(t('Hali referens yo' + O + 'q')) + '</div>';
    box.querySelectorAll('.ai-ref').forEach(function (row) {
      var r = AI.refs.find(function (x) { return x.id === row.dataset.id; }); if (!r) return;
      var save = function () { refPut(r); refsCount(); };
      row.querySelector('.ai-rn').onchange = function (e) { r.name = e.target.value.trim() || r.name; save(); };
      row.querySelector('.ai-rt').onchange = function (e) { r.tag = e.target.value.trim(); save(); };
      row.querySelector('.ai-rs').onchange = function (e) { r.note = e.target.value.trim(); save(); };
      row.querySelector('.ai-rk').onchange = function (e) { r.kind = e.target.value; save(); refsRender(); };
      row.querySelector('.ai-ru').onchange = function (e) { if (e.target.checked && AI.refs.filter(function (x) { return x.use; }).length >= MAXIMG) { e.target.checked = false; toast(t('Bitta so' + O + 'rovga 6 tagacha referens')); return; } r.use = e.target.checked; save(); };
      var ul = row.querySelector('.ai-rul'); if (ul) ul.onclick = function () { toUnderlay(r); };
      row.querySelector('.ai-rd').onclick = function () { AI.refs = AI.refs.filter(function (x) { return x !== r; }); refDel(r.id); refsRender(); };
      row.querySelectorAll('input,select').forEach(function (el) { el.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    });
    refsCount();
  }
  function refsUI() {
    var box = d.getElementById('aiRefs');
    box.innerHTML = '<label class="ai-drop" id="aiDrop">' + IC.img + '<span><b>' + esc(t('Reja, kesim, fasad, foto yoki TZ sahifasi')) + '</b><br>' + esc(t('Fayllarni tanlang yoki shu yerga tashlang · JPG, PNG, PDF')) + '</span><input type="file" id="aiRefFile" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden></label>'
      + '<div class="ai-step" id="aiRefsBusy" hidden><i></i><span>' + esc(t('Fayllar o' + O + 'qilmoqda')) + '…</span></div>'
      + '<div id="aiRefList" class="ai-rl"></div>'
      + '<p class="ai-rnote">' + esc(t('Belgilangan referenslar (6 tagacha) har so' + O + 'rovga yuboriladi. AI ularni o' + O + 'zaro solishtiradi: qavat balandligi va soni (kesim ↔ fasad), o' + O + 'lchamlar (reja ↔ fasad), derazalar ritmi. Farq bo' + O + 'lsa — o' + O + 'zi tanlamaydi, sizdan so' + O + 'raydi. Turi va tegini to' + O + 'g' + O + 'ri belgilang.')) + '</p>';
    var fi = d.getElementById('aiRefFile'), dr = d.getElementById('aiDrop');
    fi.onchange = function (e) { var fs = Array.prototype.slice.call(e.target.files || []); e.target.value = ''; ingest(fs); };
    dr.addEventListener('dragover', function (e) { e.preventDefault(); dr.classList.add('on'); });
    dr.addEventListener('dragleave', function () { dr.classList.remove('on'); });
    dr.addEventListener('drop', function (e) { e.preventDefault(); dr.classList.remove('on'); ingest(Array.prototype.slice.call(e.dataTransfer.files || [])); });
    var chip = d.createElement('button'); chip.type = 'button'; chip.id = 'aiRefChip'; chip.className = 'ai-rchip'; chip.hidden = true; chip.innerHTML = IC.img + '<span></span>'; chip.onclick = function () { tab('refs'); };
    d.querySelector('#labAI .ai-modes').appendChild(chip);
    refsLoad().then(refsRender);
  }
  function tab(n) {
    d.querySelectorAll('#labAI .ai-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.tab === n ? 'true' : 'false'); });
    d.getElementById('aiRefs').hidden = n !== 'refs'; d.getElementById('aiLog').hidden = n !== 'chat';
  }

  function buildPanel() {
    var hd = d.querySelector('body>header'); if (!hd || d.getElementById('labAI')) return;
    var b = d.createElement('button'); b.type = 'button'; b.id = 'aiBtn'; b.className = 'ai-hbtn'; b.innerHTML = IC.ai + '<span>AI</span>'; b.title = t('AI — Binokor modelini oddiy tilda oʻzgartiradi'); b.setAttribute('aria-expanded', 'false');
    var lang = hd.querySelector('.lab-lang-btn'); while (lang && lang.parentNode !== hd) lang = lang.parentNode; hd.insertBefore(b, lang || null);
    var p = d.createElement('aside'); p.id = 'labAI'; p.hidden = true; p.setAttribute('aria-label', 'AI');
    p.innerHTML = '<div class="ai-h"><span class="ai-lg">' + IC.ai + '</span><div class="ai-ht"><b>AI</b><small>Binokor modelini oddiy tilda oʻzgartiradi</small></div><button type="button" class="ai-ib" id="aiClose" aria-label="' + esc(t('Yopish')) + '">' + IC.x + '</button></div>'
      + '<div class="ai-tabs"><div class="ai-seg" role="tablist"><button type="button" role="tab" data-tab="chat" aria-pressed="true">Suhbat</button><button type="button" role="tab" data-tab="refs" aria-pressed="false">Referenslar<span class="ai-n" id="aiRefN"></span></button></div></div>'
      + '<div class="ai-b" id="aiRefs" hidden></div>'
      + '<div class="ai-b" id="aiLog"><div class="ai-intro"><p>Soʻrovni oddiy tilda yozing. AI avval reja va oldindan koʻrinishni koʻrsatadi — model faqat siz «Qoʻllash» ni bosganda oʻzgaradi.</p><div class="ai-chips">'
      + Q.map(function (q) { return '<button type="button" class="ai-chip">' + esc(q) + '</button>'; }).join('') + '</div></div></div>'
      + '<div class="ai-f"><div class="ai-att" id="aiAtt"></div>'
      + '<div class="ai-modes"><div class="ai-seg" role="group" aria-label="' + esc(t('Turi')) + '"><button type="button" data-m="edit" aria-pressed="true">Oʻzgartirish</button><button type="button" data-m="ask" aria-pressed="false">Savol</button></div>'
      + '<label class="ai-ul" id="aiUlL" hidden><input type="checkbox" id="aiUl"><span>Tayanch chizmani yuborish</span></label></div>'
      + '<div class="ai-inp"><label class="ai-ib" title="' + esc(t('Referens rasm (reja, fasad, foto)')) + '">' + IC.img + '<input type="file" id="aiImg" accept="image/jpeg,image/png,image/webp" multiple hidden></label>'
      + '<textarea id="aiQ" rows="2" placeholder="' + esc(t('Binokorga ayting…')) + '"></textarea><button type="button" class="ai-go" id="aiGo">' + IC.send + '<span id="aiPrice"></span></button></div>'
      + '<div class="ai-cost"><span id="aiBal"></span><span id="aiFree"></span></div></div>';
    d.body.appendChild(p);
    var open = function (v) { p.hidden = !v; b.setAttribute('aria-expanded', v ? 'true' : 'false'); b.classList.toggle('on', v); d.body.classList.toggle('ai-open', v); if (v) { syncUl(); price(); setTimeout(function () { d.getElementById('aiQ').focus(); }, 30); } };
    b.onclick = function () { open(p.hidden); };
    d.getElementById('aiClose').onclick = function () { open(false); };
    p.querySelectorAll('.ai-tabs button').forEach(function (x) { x.onclick = function () { tab(x.dataset.tab); }; });
    p.querySelectorAll('.ai-modes .ai-seg button').forEach(function (x) { x.onclick = function () { AI.mode = x.dataset.m; p.querySelectorAll('.ai-modes .ai-seg button').forEach(function (y) { y.setAttribute('aria-pressed', y === x ? 'true' : 'false'); }); price(); refsCount(); }; });
    p.querySelectorAll('.ai-chip').forEach(function (x) { x.onclick = function () { var q = x.textContent; d.getElementById('aiQ').value = q; if (/Tayanch chizma/.test(q)) { if (!UL[LV]) { tab('refs'); toast(t('Avval reja rasmini yuklang va «Sahnaga» ni bosing')); return; } d.getElementById('aiUl').checked = true; AI.ul = true; } if (/tekshir/i.test(q)) { setMode('ask'); } else setMode('edit'); price(); d.getElementById('aiQ').focus(); }; });
    d.getElementById('aiUl').onchange = function (e) { AI.ul = e.target.checked; price(); };
    d.getElementById('aiImg').onchange = function (e) {
      var fs = Array.prototype.slice.call(e.target.files || []).slice(0, 2); e.target.value = '';
      fs.forEach(function (f) { var u = URL.createObjectURL(f); toJpeg(u, 1500).then(function (j) { if (AI.imgs.length >= 2) AI.imgs.shift(); AI.imgs.push({ name: f.name, b64: j.b64, url: u }); att(); }).catch(function () { toast(t('Rasmni oʻqib boʻlmadi')); }); });
    };
    var q = d.getElementById('aiQ');
    q.oninput = function () { q.style.height = '40px'; q.style.height = Math.min(140, q.scrollHeight) + 'px'; };
    q.onkeydown = function (e) { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } };
    d.getElementById('aiGo').onclick = function () { if (AI.busy) { AI.ctl && AI.ctl.abort(); } else go(); };
    // eski artifact agenti (claude.use) o'rniga
    var old = d.getElementById('agPal'); if (old) old.style.setProperty('display', 'none', 'important');
    refsUI();
    if (/[?&]ai=1/.test(location.search)) open(true);
  }
  function setMode(m) { AI.mode = m; d.querySelectorAll('#labAI .ai-modes .ai-seg button').forEach(function (y) { y.setAttribute('aria-pressed', y.dataset.m === m ? 'true' : 'false'); }); }
  function syncUl() { var l = d.getElementById('aiUlL'), has = !!(UL && UL[LV]); l.hidden = !has; if (!has) { AI.ul = false; d.getElementById('aiUl').checked = false; } price(); }
  function att() {
    var el = d.getElementById('aiAtt');
    el.innerHTML = AI.imgs.map(function (x, i) { return '<span class="ai-a"><img src="' + x.url + '" alt="">' + esc(x.name.slice(0, 28)) + '<button type="button" data-i="' + i + '" aria-label="' + esc(t('Olib tashlash')) + '">' + IC.x + '</button></span>'; }).join('');
    el.querySelectorAll('button').forEach(function (b) { b.onclick = function () { AI.imgs.splice(+b.dataset.i, 1); att(); price(); }; });
    price();
  }
  function scenario() { return AI.mode === 'ask' ? 'bk.ask' : AI.ul ? 'bk.plan' : 'bk.edit'; }
  function price() {
    var c = AI.cfg; if (!c) return; var s = c.scenarios[scenario()], el = d.getElementById('aiPrice'); if (!s || !el) return;
    var free = s.tier === 'short' && (c.freeLeft || 0) > 0;
    el.textContent = c.owner ? t('bepul') : free ? t('bepul') + ' ' + c.freeLeft + '/' + c.freePerWeek : s.coins + ' ' + t('tanga');
    d.getElementById('aiFree').textContent = s.tier === 'short' ? t('Haftalik bepul savol') + ': ' + (c.freeLeft || 0) + ' / ' + c.freePerWeek : (scenario() === 'bk.plan' ? t('Tayanch chizmadan model — uzun javob') : '');
  }
  function addMsg(cls, html) { var lg = d.getElementById('aiLog'), x = d.createElement('div'); x.className = cls; x.innerHTML = html; lg.appendChild(x); lg.scrollTop = 1e6; var it = lg.querySelector('.ai-intro'); if (it) it.remove(); return x; }
  function card(p) {
    var parts = [];
    Object.keys(p.add).forEach(function (k) { parts.push('+' + p.add[k] + ' ' + t(CAT[k] || k)); });
    Object.keys(p.rem).forEach(function (k) { parts.push('−' + p.rem[k] + ' ' + t(CAT[k] || k)); });
    if (p.chg && p.chg.length) parts.push(t('oʻzgardi') + ': ' + p.chg.slice(0, 6).join(', ') + (p.chg.length > 6 ? ' +' + (p.chg.length - 6) : ''));
    var chk = '<div class="ai-row"><span class="ai-tag ok">' + esc(t('Xatosiz')) + '</span><span>' + esc(parts.join(' · ') || t('oʻzgarish')) + '</span></div>'
      + '<div class="ai-row"><span class="ai-tag ' + (p.f1 > p.f0 ? 'warn' : 'ok') + '">FAIL ' + p.f0 + ' → ' + p.f1 + '</span><span>' + esc(t('Model tekshiruvlari')) + (p.nf ? ' · ' + esc(t('yangi')) + ': ' + p.nf : '') + '</span></div>'
      + (p.rooms ? '<div class="ai-row"><span class="ai-tag ' + (p.rooms[0] === p.rooms[1] ? 'ok' : 'warn') + '">' + esc(t('Xona')) + ' ' + p.rooms[0] + '/' + p.rooms[1] + '</span><span>' + esc(t('chizmada koʻrilgan va devorlar yopgan xonalar')) + '</span></div>' : '');
    var cmds = p.lines.filter(function (l) { return !/^#/.test(l); }).length;
    var x = addMsg('ai-card live', '<div class="ai-ch">' + esc(p.summary || t('Taklif')) + '</div>' + chk
      + '<details class="ai-more"><summary>' + esc(t('Batafsil')) + ' — ' + cmds + ' ' + esc(t('buyruq')) + '</summary><pre>' + esc(p.lines.join('\n')) + '</pre></details>'
      + '<div class="ai-acts"><button type="button" class="ai-btn" data-a="no">' + esc(t('Bekor')) + '</button><button type="button" class="ai-btn" data-a="ch">' + esc(t('Oʻzgartir…')) + '</button><button type="button" class="ai-btn p" data-a="ok">' + esc(t('Qoʻllash')) + '</button></div>');
    x.querySelector('[data-a=ok]').onclick = function () { previewEnd(true); };
    x.querySelector('[data-a=no]').onclick = function () { previewEnd(false); };
    x.querySelector('[data-a=ch]').onclick = function () { var q = d.getElementById('aiQ'); q.value = t('Taklifni oʻzgartir: '); q.focus(); };
  }
  function errText(e) {
    var c = e && e.code;
    if (c === 'auth') return esc(t('AI uchun hisobingizga kiring'));
    if (c === 'insufficient') return esc(t('Tanga yetarli emas')) + (e.need ? ' (' + e.need + ')' : '') + ' — <a href="./index.html#/tanga" target="_blank" rel="noopener">' + esc(t('Tanga olish')) + '</a>';
    if (c === 'offline') return esc(t('Server bilan aloqa yoʻq. Internetni tekshiring.'));
    return esc(e && e.message ? e.message : String(e));
  }

  // kirish (pochta kodi) — Lab hisobi bilan bir xil: /auth/code → /auth/verify; sessiya cookie barcha xizmatlar uchun umumiy
  function loginCard() {
    if (d.getElementById('aiLogin')) return;
    var lg = d.getElementById('aiLog'), x = d.createElement('div'); x.className = 'ai-card ai-login'; x.innerHTML = ('<div class="ai-ch">' + esc(t('Hisobga kirish')) + '</div><div class="ai-lb"><p>' + esc(t('AI tanga bilan ishlaydi. Parol kerak emas: pochtangizga 6 xonali kod yuboramiz.')) + '</p>'
      + '<form id="aiLogin"><input type="email" id="aiEm" autocomplete="email" placeholder="pochta@misol.uz" aria-label="' + esc(t('Pochta manzili')) + '"><input id="aiCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" aria-label="' + esc(t('Kod')) + '" hidden>'
      + '<button type="submit" class="ai-btn p" id="aiLgo">' + esc(t('Kod yuborish')) + '</button></form><div class="ai-lmsg" id="aiLmsg"></div>'
      + '<p class="ai-lalt">' + esc(t('Google bilan kirish — Master reja sahifasida; keyin bu yerga qayting.')) + '</p></div>'); lg.appendChild(x); lg.scrollTop = 1e6;
    var f = x.querySelector('#aiLogin'), em = x.querySelector('#aiEm'), cd = x.querySelector('#aiCode'), bt = x.querySelector('#aiLgo'), ms = x.querySelector('#aiLmsg'), target = '';
    [em, cd].forEach(function (el) { el.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    f.onsubmit = function (e) {
      e.preventDefault(); ms.textContent = ''; bt.disabled = true;
      var p = cd.hidden ? call('/auth/code', { target: (target = em.value.trim()), lang: LANG() }).then(function () { em.hidden = true; cd.hidden = false; cd.focus(); bt.textContent = t('Kirish'); ms.textContent = t('Kod yuborildi') + ': ' + target; })
        : call('/auth/verify', { target: target, code: cd.value.trim() }).then(function () { return Promise.all([call('/me'), call('/agent/config')]); }).then(function (r) { AI.me = r[0]; AI.cfg = r[1]; price(); balance(); x.querySelector('.ai-lb').innerHTML = '<p>' + esc(t('Kirdingiz')) + (AI.me.email ? ': ' + esc(AI.me.email) : '') + '</p>'; });
      p.catch(function (er) { ms.textContent = er && er.message ? er.message : t('Xato yuz berdi'); }).then(function () { bt.disabled = false; });
    };
  }
  function balance() { var el = d.getElementById('aiBal'); if (!el) return; el.textContent = !AI.me ? '' : AI.me.owner ? t('Egasi — bepul') : t('Qoldiq') + ': ' + AI.me.balance + ' ' + t('tanga'); }

  async function go() {
    var q = d.getElementById('aiQ'), text = q.value.trim(); if (!text) { q.focus(); return; }
    if (AI.prev) previewEnd(false);
    var ulOn = AI.ul && UL && UL[LV] && AI.mode !== 'ask';
    AI.busy = true; AI.tries = 0; AI.prop = null; AI.ctl = new AbortController(); AI.ulNow = false;
    var btn = d.getElementById('aiGo'); btn.classList.add('stop'); btn.querySelector('span').textContent = t('Toʻxtatish');
    var used = AI.mode === 'ask' ? [] : AI.refs.filter(function (r) { return r.use; });
    addMsg('ai-u', esc(text) + (AI.imgs.length || ulOn || used.length ? '<div class="ai-uatt">' + (ulOn ? '<span>' + esc(t('Tayanch chizma')) + ' · ' + LV + '</span>' : '') + used.map(function (r) { return '<span>' + esc(KIND[r.kind] ? t(KIND[r.kind][0]) : r.kind) + (r.tag ? ' · ' + esc(r.tag) : '') + '</span>'; }).join('') + AI.imgs.map(function (x) { return '<span>' + esc(x.name.slice(0, 24)) + '</span>'; }).join('') + '</div>' : ''));
    tab('chat');
    var st = addMsg('ai-step', '<i></i><span>' + esc(t('Oʻylayapti')) + '…</span>');
    q.value = ''; q.style.height = '40px';
    var parts = [], sent = [], img = function (b) { return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b } }; };
    try {
      if (ulOn) {
        var u = UL[LV], j = await toJpeg(u.src, 1500);
        AI.ulk = j.w / u.w; AI.ulW = j.w; AI.ulH = j.h; AI.ulMmpx = u.s / AI.ulk; AI.ulCal = !!u.cal; AI.ulNow = true;
        if (!u.cal) toast(t('Avval masshtabni bering («Masshtab: 2 nuqta») — aks holda oʻlchamlar taxminiy boʻladi'));
        parts.push({ type: 'text', text: 'Reference U — underlay floor plan of level ' + LV + ' (pixel coordinates P(x,y) refer to THIS image)' }, img(j.b64));
        sent.push({ index: 'U', kind: 'plan (underlay on the scene)', tag: LV, px: [j.w, j.h], mm_per_px: +AI.ulMmpx.toFixed(3), calibrated: AI.ulCal });
      }
      if (ulOn) used = used.filter(function (r) { return r.hi !== UL[LV].src; });
      used.slice(0, MAXIMG - sent.length).forEach(function (r, i) {
        var lab = 'Reference ' + (i + 1) + ' — ' + KIND[r.kind][1] + (r.tag ? ', ' + r.tag : '') + ' (' + r.name + ')' + (r.note ? '; scale note: ' + r.note : '');
        parts.push({ type: 'text', text: lab }, img(r.b64)); sent.push({ index: i + 1, kind: KIND[r.kind][1], tag: r.tag || null, file: r.name, px: [r.w, r.h], scale_note: r.note || null });
      });
      AI.imgs.slice(0, MAXIMG - sent.length).forEach(function (x, i) { parts.push({ type: 'text', text: 'Attached image ' + (i + 1) + ' (' + x.name + ')' }, img(x.b64)); sent.push({ index: 'A' + (i + 1), kind: 'attached image', file: x.name }); });
      if (used.length + AI.imgs.length + (ulOn ? 1 : 0) > MAXIMG) toast(t('Bitta so' + O + 'rovga 6 tagacha rasm yuboriladi — qolganlari yuborilmadi'));
      AI.sent = sent;
      var res = await loop({ scenario: scenario(), question: text, parts: parts, signal: AI.ctl.signal,
        onRun: function (r) { if (AI.cfg) { AI.cfg.freeLeft = r.freeLeft; price(); } AI.me = AI.me || {}; AI.me.balance = r.balance; balance(); },
        onTool: function (n) { st.querySelector('span').textContent = t(STEPN[n] || 'Ishlayapti') + (n === 'binokor_try' && AI.tries ? ' (' + (AI.tries + 1) + ')' : '') + '…'; } });
      st.remove();
      if (res.text) { var a = addMsg('ai-a', md(res.text)); if (res.unsourced && res.unsourced.length) a.insertAdjacentHTML('beforeend', '<div class="ai-note">' + esc(t('Manbasi tekshirilmagan raqamlar')) + ': ' + esc(res.unsourced.slice(0, 6).join(', ')) + '</div>'); if (res.cut) a.insertAdjacentHTML('beforeend', '<div class="ai-note">' + esc(t('Javob uzunlik chegarasida uzildi')) + '</div>'); }
      if (res.status === 'limit') addMsg('ai-note', esc(t('Qadamlar chegarasi tugadi — soʻrovni qisqartirib qayta yuboring')));
      if (res.status === 'stopped') addMsg('ai-note', esc(t('Toʻxtatildi')));
      AI.hist.push({ q: text, a: (res.text || '…').slice(0, 4000) }); if (AI.hist.length > 4) AI.hist.shift();
      if (AI.prop && res.status !== 'stopped') { card(AI.prop); previewShow(); }
      AI.imgs = []; att();
    } catch (e) {
      st.remove();
      if (!(e && e.name === 'AbortError')) { addMsg('ai-err', errText(e)); if (!q.value) { q.value = text; q.oninput(); } if (e && e.code === 'auth') { AI.me = null; loginCard(); } } else addMsg('ai-note', esc(t('Toʻxtatildi')));
    } finally {
      AI.busy = false; AI.ulNow = false; btn.classList.remove('stop'); price();
    }
  }

  /* ——— ishga tushirish: server Binokorni yoqqan bo'lsagina ——— */
  call('/agent/config').then(function (c) {
    if (!c || !c.enabled || !(c.services || []).includes('bk') || !c.scenarios['bk.edit']) return;
    AI.cfg = c; buildPanel(); price();
    call('/me').then(function (m) { AI.me = m; balance(); }).catch(function () { AI.me = null; loginCard(); });
    var lv = LV; setInterval(function () { if (LV !== lv) { lv = LV; if (!d.getElementById('labAI').hidden) syncUl(); } }, 800);
  }).catch(function (e) { /* server yo'q — AI chiqmaydi */ if (!(e && e.status) && e && e.code !== 'offline') console.warn('Binokor AI:', e); });
})();
