var e=`<div class="ws ws-b">
  <div class="mtabs" style="position: absolute; top: 76px; left: 50%; transform: translateX(-50%); display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: rgba(236,235,232,.9); z-index: 3;">
    <sc-for list="{{modes}}" as="m"><button class="mtab" aria-pressed="{{m.p}}" aria-disabled="{{m.dis}}"><b>{{m.k}}</b>{{m.n}}<em class="soon">{{m.soon}}</em></button></sc-for>
  </div>

  <aside class="panel" style="position: absolute; top: 76px; left: 12px; width: 262px; bottom: 12px; padding: 14px; display: flex; flex-direction: column; gap: 9px; overflow-y: auto; z-index: 2;">
    <div><span class="t-foot">Koʻcha</span><b style="display: block; font-size: 17px;">{{tplName}}</b><span class="t-foot">Qizil chiziqlar orasi <b style="color: #141414;">{{rl}} m</b></span></div>
    <span class="lbl">ShNQ toifasi · 2.07.06-24</span>
    <div style="display: flex; flex-wrap: wrap; gap: 5px;"><sc-for list="{{sks}}" as="c"><button class="chipb" aria-pressed="{{c.p}}" onClick="{{c.pick}}" title="{{c.t}}">{{c.n}}</button></sc-for></div>
    <span class="t-foot" style="margin-top: -4px;">{{skFull}}</span>
    <span class="lbl">Dizayn-kod turi · 3.4</span>
    <div style="display: flex; flex-wrap: wrap; gap: 5px;"><sc-for list="{{uks}}" as="c"><button class="chipb" aria-pressed="{{c.p}}" onClick="{{c.pick}}" title="{{c.t}}">{{c.n}}</button></sc-for></div>
    <div class="group white" style="padding: 6px 10px;"><sc-for list="{{lims}}" as="l"><div class="lim"><span>{{l.n}}</span><b>{{l.v}}</b></div></sc-for></div>
    <section class="ks-sec">
      <button class="ks-acc" type="button" aria-expanded="{{tOpen}}" onClick="{{tToggle}}"><span class="lbl">Tayyor kesimlar</span><span class="t-foot num">{{tCount}}</span><svg class="ic sm chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></button>
      <sc-if value="{{tOpenB}}"><div class="ks-acc-body">
        <div class="ks-dd-wrap"><button class="ks-dd" type="button" aria-haspopup="listbox" aria-expanded="{{tgMenu}}" onClick="{{tgToggle}}"><span>{{tgCur}}</span><svg class="ic sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"></path></svg></button>
          <sc-if value="{{tgMenuB}}"><div class="ks-menu" role="listbox"><sc-for list="{{tgs}}" as="g"><button type="button" role="option" aria-selected="{{g.p}}" onClick="{{g.pick}}"><span>{{g.n}}</span><span class="t-foot num">{{g.c}}</span></button></sc-for></div></sc-if>
        </div>
        <sc-for list="{{tpls}}" as="t"><button class="tpl" aria-pressed="{{t.p}}" onClick="{{t.pick}}">
      <svg viewBox="0 0 230 62" style="width: 100%; display: block;" aria-hidden="true"><sc-for list="{{t.th}}" as="q"><path d="{{q.d}}" fill="{{q.f}}" stroke="{{q.s}}" stroke-width="{{q.w}}"></path></sc-for></svg>
      <span style="display: flex; justify-content: space-between; font-size: 12.5px;"><b style="font-weight: 600;">{{t.n}}</b><span class="t-foot num">{{t.w}} m · {{t.u}}</span></span>
    </button></sc-for>
      </div></sc-if>
    </section>
    <span class="lbl" style="margin-top: 2px;">Binolar</span>
    <div class="group"><div class="row" style="min-height: 38px;"><span style="flex: 1;">Chap · qavat</span><div class="stepper" style="height: 28px;"><button onClick="{{bLd}}" style="height: 28px;" aria-label="Chap bino qavatini kamaytirish">−</button><span class="v">{{bL}}</span><button onClick="{{bLu}}" style="height: 28px;" aria-label="Chap bino qavatini oshirish">+</button></div></div><div class="row" style="min-height: 38px;"><span style="flex: 1;">Oʻng · qavat</span><div class="stepper" style="height: 28px;"><button onClick="{{bRd}}" style="height: 28px;" aria-label="Oʻng bino qavatini kamaytirish">−</button><span class="v">{{bR}}</span><button onClick="{{bRu}}" style="height: 28px;" aria-label="Oʻng bino qavatini oshirish">+</button></div></div></div>
  </aside>

  <main style="position: absolute; top: 124px; left: 286px; right: 372px; bottom: 12px; display: flex; flex-direction: column; gap: 10px;">
    <div class="card" style="flex: 1; min-height: 0; position: relative; overflow: hidden; border-radius: 22px;">
      <div style="position: absolute; top: 12px; left: 14px; right: 14px; display: flex; gap: 8px; align-items: center; z-index: 2;"><div class="seg sm" style="width: 460px;"><sc-for list="{{views}}" as="v"><button aria-pressed="{{v.p}}" onClick="{{v.pick}}">{{v.n}}</button></sc-for></div><span style="flex: 1;"></span><div class="seg sm" style="width: 150px;"><sc-for list="{{gfx}}" as="v"><button aria-pressed="{{v.p}}" onClick="{{v.pick}}">{{v.n}}</button></sc-for></div></div>
      <svg viewBox="0 0 {{vw}} 680" data-xa="{{xa}}" data-xb="{{xb}}" style="position: absolute; inset: 0; width: 100%; height: 100%;" role="img" aria-label="{{alt}}">
        <rect width="{{vw}}" height="680" fill="#ffffff"></rect>
        <defs><clipPath id="ksClip"><sc-for list="{{clipR}}" as="c"><rect x="{{c.x}}" y="{{c.y}}" width="{{c.w}}" height="{{c.h}}"></rect></sc-for></clipPath></defs>
        <g clip-path="url(#ksClip)"><sc-for list="{{draw}}" as="p"><path d="{{p.d}}" fill="{{p.f}}" stroke="{{p.s}}" stroke-width="{{p.w}}" stroke-dasharray="{{p.da}}" opacity="{{p.o}}" stroke-linecap="round" stroke-linejoin="round" transform="{{p.t}}"></path></sc-for></g>
        <sc-for list="{{txt_m}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="middle" font-size="{{t.fs}}" font-weight="{{t.fw}}" fill="{{t.c}}" font-family="{{t.ff}}">{{t.t}}</text></sc-for><sc-for list="{{txt_s}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="start" font-size="{{t.fs}}" font-weight="{{t.fw}}" fill="{{t.c}}" font-family="{{t.ff}}">{{t.t}}</text></sc-for><sc-for list="{{txt_e}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="end" font-size="{{t.fs}}" font-weight="{{t.fw}}" fill="{{t.c}}" font-family="{{t.ff}}">{{t.t}}</text></sc-for>
        <sc-for list="{{zhit}}" as="z"><rect x="{{z.x}}" y="{{z.y}}" width="{{z.w}}" height="{{z.h}}" fill="#4c5bd4" opacity="0" style="cursor: pointer;" onClick="{{z.pick}}"></rect></sc-for>
        <sc-for list="{{hnd}}" as="q"><rect class="ks-hnd" x="{{q.x}}" y="{{q.y}}" width="{{q.w}}" height="{{q.h}}" rx="3" onPointerDown="{{q.down}}"></rect></sc-for>
        <sc-for list="{{uh}}" as="q"><circle class="ks-uh" cx="{{q.x}}" cy="{{q.y}}" r="{{q.r}}" onPointerDown="{{q.down}}"></circle></sc-for>
        <sc-for list="{{bb}}" as="q"><g class="ks-bb" onClick="{{q.on}}"><rect x="{{q.x}}" y="{{q.y}}" width="22" height="18" rx="9"></rect><text x="{{q.x}}" y="{{q.y}}" dx="11" dy="13" text-anchor="middle">{{q.t}}</text></g></sc-for>
      </svg>
    </div>
    <div class="card" style="padding: 10px 12px; border-radius: 18px; display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;"><span class="t-foot">Band: <b style="color: #141414;" class="num">{{used}}</b> / {{rl}} m</span><div style="flex: 1; height: 4px; border-radius: 2px; background: #ecebe8; overflow: hidden;"><i style="display: block; height: 100%; width: {{fillW}}; background: {{fillC}};"></i></div><span class="chip {{fitC}}">{{fitT}}</span><button class="tb" onClick="{{fit}}">Moslash</button><button class="tb {{uOn}}" onClick="{{tU}}">Tarmoqlar</button><button class="tb" onClick="{{auto}}">Avto joylash</button></div>
      <sc-if value="{{ufb}}"><div class="ks-ufb" style="color: {{ufb.c}};">{{ufb.t}}</div></sc-if>
      <div class="ks-strip"><sc-for list="{{blks}}" as="b"><button class="blk" aria-pressed="{{b.p}}" onClick="{{b.pick}}" style="left: {{b.l}}; width: {{b.w2}}; background: {{b.c}}; box-shadow: {{b.sh}};"><svg class="ic sm" viewBox="0 0 24 24" aria-hidden="true" style="width: 14px; height: 14px;"><path d="{{b.ic}}"></path></svg><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">{{b.n}}</span><span class="w" style="color: {{b.wc}};">{{b.w}}</span></button></sc-for><sc-for list="{{shnd}}" as="q"><i class="ks-sh" style="left: {{q.l}};" onPointerDown="{{q.down}}" title="Surib, enini oʻzgartiring (Shift — faqat chapdagi zona)"></i></sc-for></div>
      <sc-if value="{{showU}}"><div class="ks-ustrip" style="position: relative; height: {{uH}}; border-radius: 8px; background: repeating-linear-gradient(135deg,#f6efe4 0 6px,#efe6d6 6px 12px);"><sc-for list="{{ubs}}" as="u"><button class="ub" aria-pressed="{{u.p}}" onClick="{{u.pick}}" onPointerDown="{{u.down}}" style="left: {{u.l}}; top: {{u.tp}}; border-color: {{u.c}}; color: {{u.c}}; background: {{u.bg}}; box-shadow: {{u.sh}};">{{u.k}}</button></sc-for><i style="position: absolute; top: 0; bottom: 0; left: {{rlLp}}; border-left: 1.5px dashed #c0392b;"></i><i style="position: absolute; top: 0; bottom: 0; left: {{rlRp}}; border-left: 1.5px dashed #c0392b;"></i></div></sc-if>
    </div>
  </main>

  <aside class="panel" style="position: absolute; top: 76px; right: 12px; width: 348px; bottom: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; z-index: 2;">
    <sc-if value="{{isPlanZone}}"><div style="display: flex; flex-direction: column; gap: 8px;">
      <span class="lbl">Rejada joylash · {{z.n}}</span>
      <div class="seg sm"><sc-for list="{{pang}}" as="v"><button aria-pressed="{{v.p}}" onClick="{{v.pick}}">{{v.n}}</button></sc-for></div>
      <span class="t-foot">{{pangNote}}</span>
      <div style="display: flex; flex-wrap: wrap; gap: 5px;"><sc-for list="{{padd}}" as="a"><button class="chipb" onClick="{{a.pick}}" title="{{a.src}}">+ {{a.n}}</button></sc-for></div>
      <div class="group white" style="padding: 4px 8px;"><sc-for list="{{plist}}" as="r"><div style="display: flex; align-items: center; gap: 4px; padding: 5px 0; border-bottom: 1px solid #f0efec; font-size: 12.5px;"><span style="flex: 1;">{{r.n}}<span class="src" style="display: block; color: #8f8a80; font: 400 11px IBM Plex Mono, monospace;">{{r.pos}}</span></span><button class="chipb" onClick="{{r.up}}" aria-label="Yuqoriga 1 m">↑</button><button class="chipb" onClick="{{r.dn}}" aria-label="Pastga 1 m">↓</button><button class="chipb" onClick="{{r.sh}}" aria-label="Qisqartirish">−</button><button class="chipb" onClick="{{r.lg}}" aria-label="Uzaytirish">+</button><button class="chipb" onClick="{{r.del}}" aria-label="Oʻchirish">×</button></div></sc-for><span class="t-foot">{{plEmpty}}</span></div>
    </div></sc-if>
    <sc-if value="{{isZone}}"><div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 10px;"><span style="width: 36px; height: 36px; border-radius: 10px; background: {{z.c}}; display: flex; align-items: center; justify-content: center;"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="{{z.ic}}"></path></svg></span><span style="display: flex; flex-direction: column;"><b style="font-size: 17px;">{{z.n}}</b><span class="t-foot">{{z.pos}}</span></span></div>
      <div class="group white"><div class="row"><span style="flex: 1;">Eni</span><div class="stepper"><button onClick="{{wDn}}" aria-label="Enini kamaytirish">−</button><span class="div"></span><span class="v">{{z.w}}</span><span class="div"></span><button onClick="{{wUp}}" aria-label="Enini oshirish">+</button></div></div><div class="row" style="gap: 6px;"><button class="btn btn-sm" style="flex: 1;" onClick="{{mvL}}">← Chapga</button><button class="btn btn-sm" style="flex: 1;" onClick="{{mvR}}">Oʻngga →</button><button class="btn btn-sm" onClick="{{dup}}">Nusxa</button><button class="btn btn-sm btn-danger icon-btn" onClick="{{del}}" aria-label="Oʻchirish"><svg class="ic sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"></path></svg></button></div></div>
      <span class="lbl">Bu zonaga qoʻyiladi</span>
      <div class="group white" style="padding: 4px;"><sc-for list="{{z.items}}" as="i"><button class="itm" onClick="{{i.tog}}"><span class="check {{i.c}}" style="width: 20px; height: 20px;"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg></span><span style="flex: 1;">{{i.n}}</span><span class="t-foot">{{i.src}}</span></button></sc-for></div>
      <div class="note">{{z.rule}}</div>
      <span class="lbl">Zona qoʻshish</span>
      <div style="display: flex; flex-wrap: wrap; gap: 5px;"><sc-for list="{{adds}}" as="a"><button class="chipb" onClick="{{a.pick}}" style="background: {{a.c}}; color: #141414;">+ {{a.n}}</button></sc-for></div>
    </div></sc-if>
    <sc-if value="{{isUtil}}"><div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 10px;"><span class="bd" style="display: inline-block; width: 36px; height: 36px; line-height: 33px; border-radius: 10px; border: 1.5px solid {{u.c}}; color: {{u.c}}; font: 600 12px/33px IBM Plex Mono, monospace; text-align: center;">{{u.k}}</span><span style="display: flex; flex-direction: column;"><b style="font-size: 17px;">{{u.n}}</b><span class="t-foot">{{u.zone}}</span></span></div>
      <div class="group white">
        <div class="row"><span style="flex: 1;">Chap qizil chiziqdan</span><div class="stepper"><button onClick="{{uxD}}" aria-label="Chapga 0,1 m">−</button><span class="v">{{u.x}}</span><button onClick="{{uxU}}" aria-label="Oʻngga 0,1 m">+</button></div></div>
        <div class="row"><span style="flex: 1;">Chuqurlik (andoza)</span><div class="stepper"><button onClick="{{udD}}" aria-label="Sayozroq">−</button><span class="v">{{u.d}}</span><button onClick="{{udU}}" aria-label="Chuqurroq">+</button></div></div>
      </div>
      <div class="group white" style="padding: 2px 10px;"><sc-for list="{{u.rows}}" as="r"><div class="chk"><i style="background: {{r.c}};"></i><span style="flex: 1;">{{r.n}}<span class="src">{{r.src}}</span></span><b class="num" style="color: {{r.c}};">{{r.v}}</b></div></sc-for></div>
      <div style="display: flex; gap: 6px;"><button class="btn btn-sm btn-primary" style="flex: 1;" onClick="{{find}}">Joy topish</button><button class="btn btn-sm" onClick="{{ulL}}">←</button><button class="btn btn-sm" onClick="{{ulR}}">→</button><button class="btn btn-sm btn-danger" onClick="{{udel}}">Oʻchirish</button></div>
      <button class="btn btn-sm btn-ghost" onClick="{{back}}" style="align-self: flex-start; color: #141414;">← Zonalarga qaytish</button>
    </div></sc-if>
    <span class="lbl" style="margin-top: 4px;">Tekshiruv · {{okCount}}</span>
    <div class="group white" style="padding: 2px 10px;"><sc-for list="{{checks}}" as="r"><div class="chk"><i style="background: {{r.c}};"></i><span style="flex: 1;">{{r.n}}<span class="src">{{r.src}}</span></span><b class="num" style="color: {{r.c}};">{{r.v}}</b></div></sc-for></div>
    <span class="lbl" style="margin-top: 4px;">Muhandislik tarmoqlari</span>
    <span class="t-foot">Bosing — ShNQ 203-band tartibi va masofalar boʻyicha eng mos joyga qoʻyiladi.</span>
    <div><sc-for list="{{ucat}}" as="c"><button class="ucat" onClick="{{c.add}}"><span class="bd" style="border-color: {{c.c}}; color: {{c.c}};">{{c.k}}</span><span style="flex: 1;">{{c.n}}</span><span class="t-foot num">{{c.f}}</span><span class="t-foot" style="width: 16px; text-align: right;">{{c.has}}</span></button></sc-for></div>
    <div style="display: flex; gap: 6px;"><button class="btn btn-sm" onClick="{{auto}}">Avto joylash</button><button class="btn btn-sm btn-ghost" onClick="{{clr}}" style="color: #141414;">Tozalash</button></div>
  </aside>
</div>
`;export{e as default};