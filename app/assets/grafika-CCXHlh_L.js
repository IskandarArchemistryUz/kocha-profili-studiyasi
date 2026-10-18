var e=`<div class="ws ws-grafika">
  <div style="position: absolute; top: 76px; left: 24px; right: 24px; display: flex; align-items: center; gap: 12px;"><b style="font-size: 22px;">Grafik kutubxona</b><span class="t-foot">Archemistry uchun chizilgan original elementlar · metrda, kesim va reja uchun · Illustrator’da tahrirlanadi</span><span style="flex: 1;"></span><div class="seg sm" style="width: 170px;"><sc-for list="{{gfx}}" as="v"><button aria-pressed="{{v.p}}" onClick="{{v.pick}}">{{v.n}}</button></sc-for></div></div>
  <div class="card" style="position: absolute; top: 124px; left: 24px; right: 24px; bottom: 24px; border-radius: 22px; overflow: hidden;">
    <svg viewBox="0 0 1392 1100" style="width: 100%; height: 100%; display: block;" role="img" aria-label="Grafik elementlar toʻplami">
      <rect width="1392" height="1100" fill="#ffffff"></rect>
      <sc-for list="{{draw}}" as="p"><path d="{{p.d}}" fill="{{p.f}}" stroke="{{p.s}}" stroke-width="{{p.w}}" stroke-dasharray="{{p.da}}" opacity="{{p.o}}" stroke-linecap="round" stroke-linejoin="round" transform="{{p.t}}"></path></sc-for>
      <sc-for list="{{txt_m}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="middle" font-size="{{t.fs}}" font-weight="{{t.fw}}" letter-spacing="{{t.ls}}" fill="{{t.c}}" font-family="Archivo, sans-serif">{{t.t}}</text></sc-for><sc-for list="{{txt_s}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="start" font-size="{{t.fs}}" font-weight="{{t.fw}}" letter-spacing="{{t.ls}}" fill="{{t.c}}" font-family="Archivo, sans-serif">{{t.t}}</text></sc-for><sc-for list="{{txt_e}}" as="t"><text x="{{t.x}}" y="{{t.y}}" text-anchor="end" font-size="{{t.fs}}" font-weight="{{t.fw}}" letter-spacing="{{t.ls}}" fill="{{t.c}}" font-family="Archivo, sans-serif">{{t.t}}</text></sc-for>
    </svg>
  </div>
</div>
`;export{e as default};