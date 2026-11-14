from playwright.sync_api import sync_playwright
import json
J={"J1":[41.26805,69.23452],"J2":[41.27746,69.24496],"J3":[41.26612,69.24635],"J4":[41.26503,69.23779]}
CL={"R":[[41.26887,69.23527],[41.27002,69.23653],[41.27095,69.23757],[41.27219,69.23891],[41.27356,69.24044],[41.27433,69.2413],[41.27588,69.24302],[41.27682,69.24408]],"Q":[[41.27672,69.24468],[41.27421,69.24512],[41.27244,69.24538],[41.27101,69.24559],[41.2688,69.24593],[41.26719,69.24616]],"K":[[41.26602,69.24591],[41.26575,69.24296],[41.26566,69.24158],[41.26552,69.23995],[41.26532,69.23868]],"S":[[41.26555,69.23771],[41.26604,69.23739],[41.26679,69.23645],[41.26748,69.23554],[41.26774,69.2351]]}
def ext(a,b,k): return [b[0]+(b[0]-a[0])*k, b[1]+(b[1]-a[1])*k]
STUB={"J1_RSW":ext(CL["R"][1],J["J1"],1.0),"J1_C":[41.27037,69.23093],"J2_RNE":ext(CL["R"][-2],J["J2"],1.2),"J3_KE":ext(CL["K"][1],J["J3"],0.6),"J4_KW":ext(CL["K"][-2],J["J4"],0.9),"J4_SS":[41.2628,69.2381]}
RST=[['walk',4],['green',2],['bike',2,-1],['buffer',.8],['lane',3.5,-1],['lane',3.5,-1],['lane',3.25,-1],['median',1],['bus',3.5,-1],['bus',3.5,1],['median',1],['lane',3.25,1],['lane',3.5,1],['lane',3.5,1],['buffer',.8],['bike',2,1],['green',2],['walk',4]]
def sim(pg,nid,lv=2):
    pg.evaluate(f"()=>{{DS().simAlb=null;openSim({nid});return 0}}");pg.wait_for_timeout(2500)
    pg.evaluate(f"()=>{{const s=[...document.querySelectorAll('[data-lv]')].pop();s.value='{lv}';s.dispatchEvent(new Event('change'));const b=[...document.querySelectorAll('[data-b]')].pop();if(b)b.value='40';const p=[...document.querySelectorAll('[data-p]')].pop();if(p)p.value='300';return 0}}")
    pg.locator('[data-run]').last.click()
    for t in range(90):
        pg.wait_for_timeout(5000)
        if pg.evaluate("()=>!!(DS().simAlb)"): break
    v=pg.evaluate("()=>DS().simAlb?DS().simAlb.verdict:'none'");print('SIM',v[:160])
    pg.keyboard.press('Escape');pg.wait_for_timeout(500)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1500,'height':1000})
    pg.route(lambda u: not u.startswith('http://localhost') and 'leaflet' not in u,lambda r:r.abort())
    pg.route("**/unpkg.com/leaflet*/dist/leaflet.js",lambda r:r.fulfill(path='/tmp/kt/package/dist/leaflet.js'))
    pg.route("**/unpkg.com/leaflet*/dist/leaflet.css",lambda r:r.fulfill(path='/tmp/kt/package/dist/leaflet.css'))
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("try{localStorage.setItem('kps_v1',JSON.stringify({helpSeen:1}));localStorage.setItem('kps_auth','0')}catch(e){}")
    pg.goto('http://localhost:8765/tarmoq.html');pg.wait_for_timeout(2500)
    pg.evaluate("()=>document.querySelectorAll('.modal').forEach(m=>m.style.display='none')")
    # ---- MAVJUD HOLAT ----
    r=pg.evaluate("""([J,CL,STUB])=>{const ds=DS();ds.segs=[];ds.nodes=[];ds.signs=[];ds.name='Shota Rustaveli – Qushbegi – Kichik Halqa – Sergeli yoʻli uchastkasi';ds.place='Toshkent sh., Yakkasaroy va Chilonzor tumanlari';
      const N={};for(const k in J){N[k]=newNode(J[k]);N[k].type='sig';}const st={};for(const k in STUB)st[k]=newNode(STUB[k]);
      const add=(a,b,pts,p,name)=>{const s={id:ds.sid++,a:a.id,b:b.id,pts,p,name};ds.segs.push(s);return s;};
      const R=add(N.J1,N.J2,CL.R,'r6m','Shota Rustaveli koʻchasi'),Q=add(N.J2,N.J3,CL.Q,'r4m','Qushbegi koʻchasi'),K=add(N.J3,N.J4,CL.K,'r8','Kichik Halqa yoʻli'),S=add(N.J4,N.J1,CL.S,'r6m','Sergeli yoʻli');
      add(st.J1_RSW,N.J1,[],'r6m','Shota Rustaveli koʻchasi');add(N.J1,st.J1_C,[],'one2','Choʻponota koʻchasi');add(N.J2,st.J2_RNE,[],'r6m','Shota Rustaveli koʻchasi');add(N.J3,st.J3_KE,[],'r8','Kichik Halqa yoʻli');add(st.J4_KW,N.J4,[],'r8','Kichik Halqa yoʻli');add(N.J4,st.J4_SS,[],'r6m','Sergeli yoʻli');
      R.att=[{t:'bus',side:1,f:.22,len:20},{t:'bus',side:-1,f:.30,len:20},{t:'bus',side:1,f:.62,len:20},{t:'bus',side:-1,f:.70,len:20}];Q.att=[{t:'bus',side:1,f:.45,len:20},{t:'bus',side:-1,f:.55,len:20}];
      try{autoSigns();}catch(e){}afterDesign();map.fitBounds([[41.2625,69.2320],[41.2790,69.2480]],{animate:false});
      return {ids:Object.fromEntries(Object.entries(N).map(([k,v])=>[k,v.id])),R:R.id,Q:Q.id,K:K.id,S:S.id}}""",[J,CL,STUB])
    print(r)
    sim(pg,r['ids']['J2'])
    pg.evaluate("()=>{KSMAV.saveExist();return 0}")
    # ---- LOYIHA: Rustaveli BRT + velo, BRT bekatlari, kesimlar ----
    pg.evaluate("""([r,RST])=>{const ds=DS();ds.segs.filter(s=>/Rustaveli/.test(s.name)).forEach(s=>{s.st=RST.map(x=>x.slice());delete s.p;});
      const R=ds.segs.find(s=>s.id===r.R);R.att=[{t:'tramstop',f:.30,len:30,door:'right',xsig:true},{t:'tramstop',f:.68,len:30,door:'right'}];R.xw=[{f:.5,w:4,type:'signal'}];
      ds.signs=[];try{autoSigns();}catch(e){}ds.cuts=[{sg:r.R,f:.30},{sg:r.R,f:.5},{sg:r.Q,f:.45},{sg:r.K,f:.5},{sg:r.S,f:.5}];afterDesign();return 0}""",[r,RST])
    sim(pg,r['ids']['J2'])
    pg.evaluate("()=>{map.fitBounds([[41.2625,69.2320],[41.2790,69.2480]],{animate:false});return 0}");pg.wait_for_timeout(1500);pg.screenshot(path='/tmp/area/ov2.png')
    pg.evaluate(f"()=>{{map.setView([{J['J2'][0]},{J['J2'][1]}],18,{{animate:false}});return 0}}");pg.wait_for_timeout(1200);pg.screenshot(path='/tmp/area/J2b.png')
    html=pg.evaluate("async()=>{await KSALB.prepAlbum();return KSALB.albumHTML()}")
    open('/tmp/area/albom.html','w').write(html)
    open('/tmp/area/rustaveli-uchastka.kps.json','w').write(pg.evaluate("()=>JSON.stringify(Object.assign({format:'kocha-profili-studiyasi/2',saved:new Date().toISOString()},S))"))
    p2=b.new_page(viewport={'width':1600,'height':1131});p2.set_content(html);p2.wait_for_timeout(2000)
    p2.pdf(path='/tmp/area/albom.pdf',width='420mm',height='297mm',print_background=True)
    n=p2.evaluate("()=>document.querySelectorAll('section').length");print('sheets',n)
    for k in range(n): p2.locator('section').nth(k).screenshot(path=f'/tmp/area/s{k+1:02d}.png')
    print('errs',errs[:5]);b.close()
