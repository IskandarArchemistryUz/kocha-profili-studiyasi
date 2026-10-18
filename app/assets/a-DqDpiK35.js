var e=`<div class="ws ws-a">
  <div class="mtabs" style="position: absolute; top: 76px; left: 50%; transform: translateX(-50%); display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: rgba(236,235,232,.9); z-index: 3;">
    <sc-for list="{{modes}}" as="m"><button class="mtab" aria-pressed="{{m.p}}"><b>{{m.k}}</b>{{m.n}}</button></sc-for>
  </div>
  <aside class="panel" style="position: absolute; top: 76px; left: 12px; width: 262px; bottom: 12px; padding: 14px; display: flex; flex-direction: column; gap: 9px; overflow-y: auto; z-index: 2;">
    <div><span class="t-foot">Tarmoq</span><b style="display: block; font-size: 17px;">Namuna hudud</b><span class="t-foot">1,5 × 1,6 km · {{nStreets}} ta koʻcha</span></div>
    <span class="lbl">Qatlamlar</span>
    <div class="group white" style="padding: 4px;"><sc-for list="{{lay}}" as="i"><button class="itm" onClick="{{i.tog}}"><span class="check {{i.c}}" style="width: 20px; height: 20px;"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg></span><span style="flex: 1;">{{i.n}}</span><span class="t-foot">{{i.src}}</span></button></sc-for></div>
    <span class="lbl">Koʻrsatkichlar</span>
    <div class="group white" style="padding: 6px 10px;"><sc-for list="{{mets}}" as="l"><div class="lim"><span>{{l.n}}</span><b style="color: {{l.c}};">{{l.v}}</b></div></sc-for></div>
    <span class="lbl">Toifalar</span>
    <div class="group white" style="padding: 6px 10px;"><sc-for list="{{leg}}" as="l"><div class="lim" style="justify-content: flex-start; gap: 8px;"><i style="width: 22px; height: {{l.h}}; border-radius: 2px; background: {{l.c}};"></i><span>{{l.n}}</span></div></sc-for></div>
  </aside>
  <main style="position: absolute; top: 124px; left: 286px; right: 372px; bottom: 12px;">
    <div class="card" style="position: absolute; inset: 0; overflow: hidden; border-radius: 22px;">
      <svg viewBox="0 0 784 860" style="position: absolute; inset: 0; width: 100%; height: 100%;" role="img" aria-label="Koʻcha tarmogʻi xaritasi">
        <rect width="784" height="860" fill="#ffffff"></rect>
        <sc-for list="{{draw}}" as="p"><path d="{{p.d}}" fill="{{p.f}}" stroke="{{p.s}}" stroke-width="{{p.w}}" stroke-dasharray="{{p.da}}" opacity="{{p.o}}" stroke-linecap="round" stroke-linejoin="round"></path></sc-for>
        <sc-for list="{{hit}}" as="h"><path d="{{h.d}}" fill="none" stroke="#4c5bd4" stroke-width="14" opacity="0" style="cursor: pointer;" onClick="{{h.pick}}"></path></sc-for>
        <sc-for list="{{txt_m}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="middle" font-size="{{t.fs}}" font-weight="{{t.fw}}" fill="{{t.c}}" font-family="{{t.ff}}">{{t.t}}</text></sc-for><sc-for list="{{txt_s}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="start" font-size="{{t.fs}}" font-weight="{{t.fw}}" fill="{{t.c}}" font-family="{{t.ff}}">{{t.t}}</text></sc-for><sc-for list="{{txt_e}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="end" font-size="{{t.fs}}" font-weight="{{t.fw}}" fill="{{t.c}}" font-family="{{t.ff}}">{{t.t}}</text></sc-for>
      </svg>
    </div>
  </main>
  <aside class="panel" style="position: absolute; top: 76px; right: 12px; width: 348px; bottom: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; z-index: 2;">
    <sc-if value="{{hasSel}}"><div style="display: flex; flex-direction: column; gap: 10px;">
      <div><span class="t-foot">Tanlangan koʻcha</span><b style="display: block; font-size: 17px;">{{sel.n}}</b><span class="t-foot">{{sel.info}}</span></div>
      <span class="lbl">ShNQ toifasi</span>
      <div style="display: flex; flex-wrap: wrap; gap: 5px;"><sc-for list="{{sel.cls}}" as="c"><button class="chipb" aria-pressed="{{c.p}}" onClick="{{c.pick}}">{{c.n}}</button></sc-for></div>
      <div class="group white" style="padding: 6px 10px;"><sc-for list="{{sel.rows}}" as="l"><div class="lim"><span>{{l.n}}</span><b style="color: {{l.c}};">{{l.v}}</b></div></sc-for></div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;"><button class="btn btn-sm" onClick="{{sel.addX}}">+ Oʻtish joyi</button><button class="btn btn-sm" onClick="{{sel.addS}}">Bekatlarni 500 m da joylash</button><button class="btn btn-sm btn-ghost" onClick="{{sel.clr}}" style="color: #141414;">Tozalash</button></div>
      <a class="btn btn-sm btn-primary" href="#/b" style="text-decoration: none; justify-content: center;">Kesimini ochish (B) →</a>
      <button class="btn btn-sm btn-ghost" onClick="{{unsel}}" style="align-self: flex-start; color: #141414;">← Butun tarmoq</button>
    </div></sc-if>
    <span class="lbl">Tekshiruv · {{okCount}}</span>
    <div class="group white" style="padding: 2px 10px;"><sc-for list="{{checks}}" as="r"><div class="chk"><i style="background: {{r.c}};"></i><span style="flex: 1;">{{r.n}}<span class="src">{{r.src}}</span></span><b class="num" style="color: {{r.c}};">{{r.v}}</b></div></sc-for></div>
    <div class="note">Koʻchani bosing — toifasini oʻzgartiring, «+ Oʻtish joyi» eng katta boʻshliqqa qoʻyiladi, bekatlar esa ~500 m qadam bilan, chorrahadan 25 m keyin joylashadi. Qizil kesmalar — meʼyordan uzun oraliqlar.</div>
  </aside>
</div>
`;export{e as default};