# Bogʻshunos — konsepsiya generatori (Bobur eko bogʻi): 3 variant
import pickle, json, math, warnings, sys
warnings.filterwarnings('ignore')
import numpy as np, networkx as nx
from shapely.geometry import Point, LineString, Polygon, MultiPolygon, box
from shapely.ops import unary_union, transform, linemerge
from shapely import prepared, affinity
D='/home/claude/bg/'
S,F,C=pickle.load(open(D+'f.pkl','rb')); tin,paths,water,power,bld,ent=pickle.load(open(D+'f2.pkl','rb'))
lake,canA=pickle.load(open(D+'water.pkl','rb')); LY=pickle.load(open(D+'lay.pkl','rb'))
G0=np.load(D+'grid.npz'); gx,gy,SL=G0['xs'],G0['ys'],G0['sl']
X0,Y0=S.bounds[0],S.bounds[1]
loc=lambda g: affinity.translate(g,-X0,-Y0)
S=loc(S); lake=loc(lake); canal=loc(LY['canal']); strip=loc(LY['strip'])
bldU=unary_union([loc(g) for t,g in bld])
exist_paths=[(h,loc(g)) for h,g,t in paths]
EX=unary_union([g for h,g in exist_paths])
trees=[dict(p=loc(t['p']),n=t['n'],d=t['dbh'],c=t['cr'],h=t['h']) for t in tin]
for t in trees: t['rpa']=min(15,max(2,12*t['d']/100))
island=Polygon(lake.interiors[0])
pitches=[loc(g) for t,g,e in F if t.get('leisure') in('pitch','fitness_station') and g.geom_type=='Polygon' and S.intersects(loc(g))]
playg=[loc(g) for t,g,e in F if t.get('leisure')=='playground' and g.geom_type=='Polygon' and S.intersects(loc(g))]
def slope_at(x,y):
    i=int((x+X0-gx[0])/5); j=int((y+Y0-gy[0])/5)
    if 0<=j<SL.shape[0] and 0<=i<SL.shape[1]: return SL[j,i]
    return 0
# ---------- tashqi jalb nuqtalari (OSM) ----------
def near_feats(filt,R=900):
    out=[]
    for t,g,e in F:
        if filt(t):
            gl=loc(g).centroid
            if gl.distance(S)<R: out.append((t.get('name') or '',gl))
    return out
metro=near_feats(lambda t:t.get('railway')=='subway_entrance')
stops=near_feats(lambda t:t.get('highway')=='bus_stop')
ATTR=[]
if metro:
    m=min(metro,key=lambda z:z[1].distance(S)); ATTR.append(('Metro «'+m[0]+'»',m[1],5.0))
for nm,p in stops:
    if p.distance(S)<320: ATTR.append(('Bekat «'+nm+'»',p,1.2))
# gʻarbdagi turar joy (GHS-POP: gʻarb va janubi-gʻarb zich) — 3 nuqta (P)
for yy,w in ((120,3.0),(300,3.0),(470,2.5)):
    ATTR.append((f'Turar joy (gʻarb, y={yy})',Point(-150,yy),w))
ATTR.append(('TashMU / shifoxonalar (sharq)',Point(420,20),2.0))
INNER={'Koʻl terrasasi (janub)':(Point(178,112),3.0),'Bolalar maydoni':(Point(167,390),3.0),'Sport':(Point(90,300),2.0),
       'Ekokafe':(Point(136,490),1.5),'Amfiteatr (koʻl gʻarbi)':(Point(122,215),2.0),'Tarixiy darvoza (arka)':(Point(29,551),1.0)}
# ---------- darvozalar ----------
B=S.exterior
def cluster(pts,tol=18):
    pts=sorted(pts,key=lambda p:B.project(p)); out=[]
    for p in pts:
        if out and B.project(p)-B.project(out[-1][-1])<tol: out[-1].append(p)
        else: out.append([p])
    return [B.interpolate(np.mean([B.project(q) for q in g])) for g in out]
def gates_for(variant):
    pts=[p for h,p in [(h,loc(p)) for h,p in ent]]
    if variant in('B','C'):   # yangi gʻarbiy darvozalar turar joy tomonga (R1: xohish chizigʻi)
        for yy in (250,430):
            ln=LineString([(-50,yy),(140,yy)]); x=ln.intersection(B)
            q=x if x.geom_type=='Point' else min(x.geoms,key=lambda z:z.x)
            pts.append(q)
    return cluster(pts)
# ---------- marshrut setkasi ----------
STEP=3.0
MOV=[(1,0),(0,1),(1,1),(1,-1),(2,1),(1,2),(2,-1),(1,-2)]
def build(variant,prm):
    allowed=S.buffer(-0.5).difference(lake.buffer(1.5)).difference(bldU.buffer(1.0))
    # kanal: faqat mavjud koʻpriklar/oʻtish joylarida
    cross=unary_union([g.intersection(strip) for h,g in exist_paths if g.intersects(canal)]).buffer(3)
    allowed=allowed.difference(canal.buffer(4).difference(cross))
    if variant in('B','C'):   # koʻprik orolga (koʻl ustidan) — orol va 2 koʻprik
        br1=LineString([(132,226),(152,226)]).buffer(1.6); br2=LineString([(196,160),(206,138)]).buffer(1.6)
        allowed=allowed.union(island.buffer(-1)).union(br1).union(br2)
    pa=prepared.prep(allowed); pe=prepared.prep(EX.buffer(2.0))
    rp=[(t['p'],t['rpa']*prm['rpa_k'],t['d']) for t in trees if t['d']>=20]
    from shapely.strtree import STRtree
    tr=STRtree([p for p,r,d in rp])
    minx,miny,maxx,maxy=allowed.bounds; ok={}
    for i in range(int((maxx-minx)/STEP)+2):
        for j in range(int((maxy-miny)/STEP)+2):
            x,y=minx+i*STEP,miny+j*STEP
            if pa.contains(Point(x,y)): ok[(i,j)]=(x,y)
    def pen(x,y):
        p=Point(x,y); m=1.0
        if pe.contains(p): m*=prm['exist']
        for k in tr.query(p.buffer(15)):
            q,r,d=rp[k]
            if p.distance(q)<r: m*=prm['tree']; break
        s=slope_at(x,y)
        if s>8: m*=prm['slope']
        return m
    PEN={k:pen(*v) for k,v in ok.items()}
    G=nx.Graph()
    for (i,j),p in ok.items():
        for di,dj in MOV:
            q=(i+di,j+dj)
            if q in ok:
                d=math.dist(p,ok[q]); G.add_edge((i,j),q,w=d*(PEN[(i,j)]+PEN[q])/2,flow=0.0)
    for n in G.nodes: G.nodes[n]['xy']=ok[n]
    return G,allowed
def snap(G,p,cache={}):
    return min(G.nodes,key=lambda n:(G.nodes[n]['xy'][0]-p.x)**2+(G.nodes[n]['xy'][1]-p.y)**2)
def ods_for(gates):
    out=[]
    def gate_of(a):  # tashqi nuqtadan eng yaqin darvoza (perimetr boʻylab yurish hisobga olinmaydi — P)
        return min(range(len(gates)),key=lambda k:gates[k].distance(a))
    for nm,a,wa in ATTR:
        g=gate_of(a)
        for dn,(d,wd) in INNER.items():
            out.append(dict(o=nm,d=dn,a=gates[g],b=d,f=wa*wd/(a.distance(d)+50)*100,k='manzil'))
    # tranzit: gʻarb turar joy ↔ sharq/janub bekatlari va metro
    for i in range(len(ATTR)):
        for j in range(i+1,len(ATTR)):
            n1,a,w1=ATTR[i]; n2,b,w2=ATTR[j]
            ga,gb=gate_of(a),gate_of(b)
            if ga!=gb and gates[ga].distance(gates[gb])>120:
                out.append(dict(o=n1,d=n2,a=gates[ga],b=gates[gb],f=w1*w2/(a.distance(b)+50)*100,k='tranzit'))
    return out
def route(G,ods,beta):
    for od in sorted(ods,key=lambda z:-z['f']):
        s=snap(G,od['a']); t=snap(G,od['b'])
        try: path=nx.dijkstra_path(G,s,t,weight=lambda u,v,d:d['w']*(1-beta if d['flow']>0 else 1))
        except nx.NetworkXNoPath: od['path']=None; continue
        for u,v in zip(path,path[1:]): G[u][v]['flow']+=od['f']
        od['path']=[G.nodes[n]['xy'] for n in path]
        od['net']=sum(G[u][v]['w']*0+math.dist(G.nodes[u]['xy'],G.nodes[v]['xy']) for u,v in zip(path,path[1:]))
        od['prd']=od['net']/max(10,od['a'].distance(od['b']))
def chaikin(pts,it=3):
    for _ in range(it):
        if len(pts)<3: return pts
        q=[pts[0]]
        for a,b in zip(pts,pts[1:]): q+=[(0.75*a[0]+0.25*b[0],0.75*a[1]+0.25*b[1]),(0.25*a[0]+0.75*b[0],0.25*a[1]+0.75*b[1])]
        q.append(pts[-1]); pts=q
    return pts
def extract(G):
    H=nx.Graph()
    for u,v,d in G.edges(data=True):
        if d['flow']>1e-6: H.add_edge(u,v,flow=d['flow'])
    ends={n for n in H.nodes if H.degree(n)!=2}; seen=set(); ch=[]
    for s in ends:
        for nb in H.neighbors(s):
            if (s,nb) in seen: continue
            c=[s,nb]; seen|={(s,nb),(nb,s)}
            while c[-1] not in ends:
                nx_=[m for m in H.neighbors(c[-1]) if m!=c[-2]][0]; seen|={(c[-1],nx_),(nx_,c[-1])}; c.append(nx_)
            fl=max(H[a][b]['flow'] for a,b in zip(c,c[1:]))
            xy=list(LineString([G.nodes[n]['xy'] for n in c]).simplify(2.5).coords)
            ch.append(dict(xy=chaikin(xy),flow=fl))
    return ch
VAR={
 'A':dict(name='A · Saqlovchi',desc='Mavjud yoʻl tarmogʻi deyarli toʻliq qoladi; yangi yoʻl faqat yetishmagan bogʻlanishlarda. Eng arzon, daraxtlarga eng yumshoq.',
          prm=dict(exist=0.15,tree=2.5,rpa_k=0.7,slope=1.3),beta=0.6,keep_exist=True,meadow=0.0,promenade=False),
 'B':dict(name='B · Koʻl halqasi',desc='Koʻl atrofida 4 m sohil promenadasi, gʻarbiy turar joydan 2 ta yangi darvoza, orolga 2 koʻprik va amfiteatr. Shahar parki xarakteri.',
          prm=dict(exist=0.45,tree=4.0,rpa_k=1.0,slope=1.5),beta=0.55,keep_exist=False,meadow=0.25,promenade=True),
 'C':dict(name='C · Ekologik qirgʻoq',desc='Halqa + koʻprik, lekin qattiq qoplama minimal: soʻqmoqlar, botqoq qirgʻoq, maysaning yarmi — oʻtloq. Suv va bioxilma-xillikka ustuvorlik.',
          prm=dict(exist=0.55,tree=8.0,rpa_k=1.2,slope=1.8),beta=0.7,keep_exist=False,meadow=0.5,promenade=True),
}
def run(v):
    P=VAR[v]; gates=gates_for(v)
    G,allowed=build(v,P['prm']); ods=ods_for(gates); route(G,ods,P['beta']); ch=extract(G)
    fmax=max(c['flow'] for c in ch)
    for c in ch:
        r=c['flow']/fmax
        c['tier'],c['w']=('asosiy',5.0) if r>=0.35 else (('ikkinchi',3.0) if r>=0.10 else ('soqmoq',1.8))
        if v=='C' and c['tier']=='asosiy': c['w']=4.0
        if v=='C' and c['tier']=='ikkinchi': c['w']=2.4
    net=[dict(g=LineString(c['xy']),tier=c['tier'],w=c['w']) for c in ch if len(c['xy'])>1]
    if P['keep_exist']:
        used=unary_union([n['g'].buffer(4) for n in net])
        for h,g in exist_paths:
            rest=g.difference(used)
            for seg in getattr(rest,'geoms',[rest]):
                if seg.length>8: net.append(dict(g=seg,tier='mavjud',w=2.5))
    if not P['keep_exist']:
        # qamrov qoidasi (T): har nuqta yoʻldan ≤ 35 m. Yetmagan joylarda mavjud yoʻllar soʻqmoq sifatida qoladi
        gen_u=unary_union([n['g'] for n in net])
        for h,g in exist_paths:
            L=g.length; k=max(1,int(L//15))
            for i in range(k):
                seg=LineString([g.interpolate(i/k,normalized=True),g.interpolate((i+1)/k,normalized=True)])
                if seg.length>3 and seg.centroid.distance(gen_u)>18 and not lake.contains(seg.centroid):
                    net.append(dict(g=seg,tier='soqmoq',w=2.0 if v=='B' else 1.6,keep=True))
    if P['promenade']:
        ring=lake.buffer(6 if v=='B' else 9).exterior.intersection(S.buffer(-3)).difference(canal.buffer(6))
        for seg in getattr(ring,'geoms',[ring]):
            if seg.length>15: net.append(dict(g=seg,tier='sohil',w=4.0 if v=='B' else 2.4))
    # koʻpriklar
    bridges=[]
    if v in('B','C'):
        bridges=[LineString([(128,226),(154,226)]),LineString([(196,163),(207,135)])]
        if v=='C': bridges.append(LineString([(170,275),(176,300)]))
    # qoplama poligoni
    pp=unary_union([n['g'].buffer(n['w']/2,cap_style=1) for n in net]).intersection(S).difference(lake)
    plazas=[]
    for gp in gates:
        f=sum(od['f'] for od in ods if od.get('path') and (od['a'].equals(gp) or od['b'].equals(gp)))
        plazas.append((gp,f))
    fm=max(f for g,f in plazas) or 1
    plz=unary_union([g.buffer(6+10*f/fm) for g,f in plazas]).intersection(S).difference(lake)
    hard=unary_union([pp,plz])
    # dastur
    prog={}
    prog['amfiteatr']=Point(118,215).buffer(18).intersection(Polygon([(118,215),(150,180),(150,250)]).buffer(2)) if v!='A' else Polygon()
    if v=='C': prog['amfiteatr']=Point(118,215).buffer(14).intersection(Polygon([(118,215),(150,185),(150,245)]))
    ex_sport=unary_union(pitches); need=max(0,3395-ex_sport.area)
    courts=[]; hard_main=unary_union([n['g'].buffer(n['w']/2) for n in net if n['tier']!='soqmoq']+[plz]); occ=unary_union([hard_main,bldU.buffer(3),lake.buffer(10),ex_sport.buffer(4),prog['amfiteatr'].buffer(3)])
    rpaU=unary_union([t['p'].buffer(t['rpa']) for t in trees if t['d']>=20])
    tot=0
    for cx in range(20,250,6):
        for cy in range(20,570,6):
            if tot>=need: break
            r=box(cx,cy,cx+28,cy+15) if need-tot>300 else box(cx,cy,cx+20,cy+12)
            if S.buffer(-3).contains(r) and not r.intersects(occ) and r.intersection(rpaU).area<45 and np.mean([slope_at(*q) for q in r.exterior.coords])<12:
                courts.append(r); occ=occ.union(r.buffer(5)); tot+=r.area
    prog['sport_yangi']=unary_union(courts) if courts else Polygon()
    prog['sport_mavjud']=ex_sport
    pg=unary_union(playg)
    prog['bolalar']=pg.union(pg.buffer(14).difference(hard).difference(bldU.buffer(2)).intersection(S)) if v!='A' else pg
    prog['terrasa']=Point(178,118).buffer(14).intersection(lake.buffer(9)).difference(lake.buffer(-0.01).difference(lake)) if v!='A' else Polygon()
    prog['terrasa']=prog['terrasa'].difference(lake) if not prog['terrasa'].is_empty else prog['terrasa']
    prog['qushxona']=Point(178,250).buffer(4) if v=='C' else (Point(175,240).buffer(3) if v=='B' else Polygon())
    # botqoq qirgʻoq (C) va yomgʻir bogʻlari (B,C)
    prog['botqoq']=lake.buffer(5).difference(lake).difference(hard.buffer(1)).intersection(S) if v=='C' else Polygon()
    rg=[]
    if v in('B','C'):
        for n in net:
            if n['tier']=='asosiy' and n['g'].length>40:
                mid=n['g'].interpolate(0.5,normalized=True)
                if mid.distance(lake)<90: rg.append(n['g'].buffer(n['w']/2+4,cap_style=2).difference(n['g'].buffer(n['w']/2+0.8)).intersection(Point(mid.x,mid.y).buffer(14)))
    prog['yomgir_bogi']=unary_union(rg).difference(hard).intersection(S) if rg else Polygon()
    # oʻtloq: maysa (OSM grass) ichida yoʻldan ≥ 8 m, koʻl qirgʻogʻidan tashqari
    grass=unary_union([loc(g) for t,g,e in F if t.get('landuse')=='grass' and g.geom_type=='Polygon' and S.intersects(loc(g))]).intersection(S)
    core=grass.difference(hard.buffer(8)).difference(unary_union([p for k,p in prog.items() if not p.is_empty]).buffer(4))
    if P['meadow']>0:
        parts=sorted(getattr(core,'geoms',[core]),key=lambda g:-g.area); tot=0; mm=[]
        for g in parts:
            if tot>=P['meadow']*grass.area: break
            mm.append(g); tot+=g.area
        prog['otloq']=unary_union(mm)
    else: prog['otloq']=Polygon()
    # daraxt ziddiyatlari
    exw=EX.buffer(1.6)
    occ_all=unary_union([hard,prog['sport_yangi'],prog['amfiteatr'],prog['terrasa']]).difference(exw)
    kch=[t for t in trees if occ_all.contains(t['p'])]
    big=[t for t in kch if t['d']>=40]
    # metrikalar
    A=S.area; W_=lake.area
    soft_hard=sum(g.area for k,g in prog.items() if k in('sport_yangi','amfiteatr','terrasa'))
    hardA=hard.area+bldU.area+soft_hard
    prd=[od['prd'] for od in ods if od.get('path')]
    shore=lake.exterior.length; acc=sum(n['g'].length for n in net if n['tier']=='sohil')
    lawn_left=grass.area-prog['otloq'].area
    irr=(lawn_left*15+prog['otloq'].area*3+(A-W_-hardA-grass.area)*3)/1000, (lawn_left*20+prog['otloq'].area*4+(A-W_-hardA-grass.area)*4)/1000
    M=dict(gates=len(gates),path_len=round(sum(n['g'].length for n in net)),
           tier_len={t:round(sum(n['g'].length for n in net if n['tier']==t)) for t in ('asosiy','ikkinchi','soqmoq','sohil','mavjud')},
           hard_m2=round(hardA),green_pct=round((A-W_-hardA)/A*100,1),prd_mean=round(float(np.mean(prd)),2),prd_p90=round(float(np.percentile(prd,90)),2),
           od_n=len(prd),sport_m2=round(ex_sport.area+prog['sport_yangi'].area),meadow_m2=round(prog['otloq'].area),
           trees_conflict=len(kch),trees_conflict_big=len(big),shore_access_m=round(acc),irr=(round(irr[0]),round(irr[1])),
           rain_garden_m2=round(prog['yomgir_bogi'].area),wetland_m2=round(prog['botqoq'].area))
    return dict(v=v,P=P,gates=gates,net=net,bridges=bridges,hard=hard,plazas=plazas,prog=prog,ods=ods,M=M,kch=kch,grass=grass)
if __name__=='__main__':
    R={}
    for v in sys.argv[1:] or 'ABC':
        r=run(v); R[v]=r; print(v,json.dumps(r['M'],ensure_ascii=False))
    pickle.dump(dict(R=R,S=S,lake=lake,canal=canal,strip=strip,bld=bldU,trees=trees,island=island,exist=exist_paths,X0=X0,Y0=Y0,ATTR=ATTR,INNER=INNER),open(D+'design.pkl','wb'))
