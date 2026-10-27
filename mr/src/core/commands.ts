/**
 * Buyruqlar — hujjatni oʻzgartirishning yagona yoʻli.
 * Har bir buyruq sof funksiya: (hujjat, buyruq) → yangi hujjat. Eski hujjat oʻzgarmaydi —
 * shu sabab undo/redo oddiy: oldingi hujjatga qaytish kifoya.
 */
import { type Building, type ContextSettings, type LngLat, type Project, type Ring, type Garage, type Parcel, type Settings, type Street, type ZoneLabel, type ManualPoi, type SavedView, type SheetDoc, uid, CTX_R_MIN, CTX_R_MAX } from './doc';
import { frame } from './geo';
import type { UserLayerMeta } from './userlayers';

export type Command =
  | { type: 'rename'; name: string }
  | { type: 'setOrigin'; origin: LngLat }
  /** hududni boshqa joyga koʻchirish; carry — uchastka va binolar ham yangi markazga koʻchadi (shakli saqlanadi) */
  | { type: 'moveProject'; origin: LngLat; carry: boolean }
  | { type: 'setContext'; patch: Partial<Omit<ContextSettings, 'layers'>> & { layers?: Partial<ContextSettings['layers']> } }
  | { type: 'setSite'; rings: Ring[] }
  | { type: 'clearSite' }
  | { type: 'addBuilding'; footprint: Ring; floors: number; nonRes?: number; use?: Building['use']; id?: string }
  | { type: 'updateBuilding'; id: string; patch: Partial<Omit<Building, 'id'>> }
  | { type: 'removeBuilding'; id: string }
  /** tanlanganlarni oʻchirish: loyiha binolari va atrofdagi (OSM) binolar — bitta qadam */
  | { type: 'deleteSelection'; ids: string[]; ctx: number[] }
  /** atrofdagi olib tashlangan binolar roʻyxatini almashtirish (qaytarish) */
  | { type: 'setRemoved'; removed: number[] }
  | { type: 'setRemovedRoads'; ids: number[] }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'addStreet'; axis: LngLat[]; profile: string; id?: string; osm?: number }
  | { type: 'updateStreet'; id: string; patch: Partial<Omit<Street, 'id'>> }
  | { type: 'updateStreets'; patches: { id: string; patch: Partial<Omit<Street, 'id'>> }[] }
  | { type: 'removeStreet'; id: string }
  /** koʻcha toʻri generatsiyasi: avvalgi generatsiya koʻchalari almashtiriladi, qoʻlda chizilganlar qoladi */
  | { type: 'setGridStreets'; streets: { axis: LngLat[]; profile: string; id?: string }[]; patches?: { id: string; patch: Partial<Omit<Street, 'id'>> }[]; /** uchastkani kesib oʻtgan mavjud (OSM) koʻchalar — loyihaga olinadi */ adopt?: { axis: LngLat[]; profile: string; osm: number; id?: string }[] }
  /** zona belgilarini toʻliq almashtirish (kvartalga tegishlilikni chaqiruvchi geometriya boʻyicha hal qiladi) */
  | { type: 'setZones'; zones: ZoneLabel[] }
  | { type: 'setKeep'; keep: number[]; at?: Record<string, LngLat>; rings?: Record<string, Ring> }
  | { type: 'addPoi'; poi: ManualPoi }
  | { type: 'removePoi'; id: string }
  /** bir nechta binoga material va/yoki tom turi */
  | { type: 'styleBuildings'; ids: string[]; mat?: Building['mat']; roof?: Building['roof']; win?: Building['win'] | 'yoq'; bal?: Building['bal']; parapet?: number; shade?: Building['shade'] | 'yoq'; winPat?: Building['winPat'] | 'qator'; balPat?: Building['balPat'] | 'har2' }
  | { type: 'addView'; view: SavedView }
  /** varaqlar toʻplami va saqlangan uslublar (MR-Varaqlar) */
  | { type: 'setSheets'; sheets?: SheetDoc[]; styles?: Project['sheetStyles'] }
  | { type: 'setChizmadon'; data: Record<string, unknown> }
  /** import qilingan qatlam tavsifi (obyektlar IndexedDB ga oldindan yoziladi) */
  | { type: 'addUserLayer'; meta: UserLayerMeta }
  | { type: 'updateUserLayer'; id: string; patch: Partial<Omit<UserLayerMeta, 'id'>> }
  | { type: 'removeUserLayer'; id: string }
  | { type: 'removeView'; id: string }
  /** kvartal parsellarini almashtirish (boʻlish, kesish, birlashtirish; boʻsh — kvartal butun) */
  | { type: 'setParcels'; block: string; parcels: Omit<Parcel, 'block'>[]; label?: ZoneLabel }
  | { type: 'updateParcel'; id: string; patch: Partial<Pick<Parcel, 'use' | 'rings'>> }
  /** generator natijasi: shu guruhdagi seksiyalarni almashtirish (boʻsh roʻyxat — tozalash); zona belgisiga parametrlar yoziladi */
  | { type: 'replaceGroup'; grp: string; sections: { footprint: Ring; floors: number; nonRes: number; use: Building['use']; kind: string; z0?: number }[]; label?: ZoneLabel; garage?: Omit<Garage, 'id' | 'grp'> | null; /** yer uchastkasi (grp = parsel id) parametrlari */ parcelGen?: Record<string, unknown>; /** shu hududdagi boshqa guruhlarning eski avtomatik binolari va avtoturargohlari (ustiga qurilmasin) */ drop?: { bids: string[]; gids: string[] } };

/** Tarixda koʻrinadigan nom */
export function label(c: Command): string {
  switch (c.type) {
    case 'rename': return 'Nom oʻzgardi';
    case 'setOrigin': return 'Hudud markazi';
    case 'moveProject': return 'Hudud koʻchirildi';
    case 'setContext': return 'Kontekst';
    case 'setSite': return 'Uchastka chegarasi';
    case 'clearSite': return 'Uchastka oʻchirildi';
    case 'addBuilding': return 'Bino qoʻshildi';
    case 'updateBuilding': return 'Bino oʻzgardi';
    case 'removeBuilding': return 'Bino oʻchirildi';
    case 'deleteSelection': return `Oʻchirildi: ${c.ids.length + c.ctx.length} ta obyekt`;
    case 'setRemoved': return 'Atrof binolari qaytarildi';
    case 'setRemovedRoads': return 'Atrofdagi yoʻl';
    case 'setSettings': return 'Sozlamalar';
    case 'addStreet': return 'Koʻcha qoʻshildi';
    case 'updateStreet': return 'Koʻcha oʻzgardi';
    case 'updateStreets': return 'Koʻchalar oʻzgardi';
    case 'removeStreet': return 'Koʻcha oʻchirildi';
    case 'setGridStreets': return c.streets.length ? 'Koʻcha toʻri generatsiyasi' : 'Toʻr koʻchalari olib tashlandi';
    case 'setZones': return 'Zona';
    case 'setKeep': return 'Saqlanadigan binolar';
    case 'addPoi': return 'Xizmat obyekti qoʻshildi';
    case 'removePoi': return 'Xizmat obyekti oʻchirildi';
    case 'styleBuildings': return c.roof ? 'Tom turi' : c.win ? 'Deraza turi' : c.bal ? 'Balkon turi' : c.parapet != null ? 'Parapet' : c.shade ? 'Quyosh himoyasi' : 'Fasad materiali';
    case 'addView': return 'Koʻrinish saqlandi';
    case 'setSheets': return 'Varaqlar';
    case 'setChizmadon': return 'Chizmadon';
    case 'addUserLayer': return `Qatlam qoʻshildi: ${c.meta.name}`;
    case 'updateUserLayer': return 'overrides' in c.patch ? 'Obyekt rangi' : 'Qatlam sozlamasi';
    case 'removeUserLayer': return 'Qatlam olib tashlandi';
    case 'removeView': return 'Koʻrinish oʻchirildi';
    case 'setParcels': return 'Parsellar';
    case 'updateParcel': return 'Parsel funksiyasi';
    case 'replaceGroup': return c.sections.length ? 'Seksiyalar generatsiyasi' : 'Seksiyalar tozalandi';
  }
}

const copyRing = (r: Ring): Ring => r.map(p => [p[0], p[1]] as LngLat);

export class CommandError extends Error {}

export function apply(doc: Project, c: Command, now = new Date()): Project {
  const d: Project = { ...doc, updated: now.toISOString() };
  switch (c.type) {
    case 'rename': {
      const n = c.name.trim();
      if (!n) throw new CommandError('Nom boʻsh boʻlmasin');
      d.name = n.slice(0, 120); return d;
    }
    case 'setOrigin': d.origin = [c.origin[0], c.origin[1]]; return d;
    case 'moveProject': {
      const o: LngLat = [c.origin[0], c.origin[1]];
      if (!(Math.abs(o[0]) <= 180 && Math.abs(o[1]) <= 90)) throw new CommandError('Koordinata notoʻgʻri');
      d.origin = o;
      if (c.carry) {
        const a = frame(doc.origin), b = frame(o), mv = (r: Ring): Ring => r.map(p => b.toGeo(a.toLocal(p)));
        if (doc.site) d.site = { rings: doc.site.rings.map(mv) };
        d.buildings = doc.buildings.map(x => ({ ...x, footprint: mv(x.footprint) }));
        d.streets = doc.streets.map(x => ({ ...x, axis: mv(x.axis) }));
        d.zones = doc.zones.map(z => ({ ...z, at: mv([z.at])[0] }));
        d.parcels = doc.parcels.map(p => ({ ...p, rings: p.rings.map(mv) }));
        d.garages = doc.garages.map(g => ({ ...g, ring: mv(g.ring), ...(g.stalls ? { stalls: g.stalls.map(mv) } : {}), ...(g.aisles ? { aisles: g.aisles.map(mv) } : {}) }));
        d.keep = []; delete d.keepAt; delete d.keepRings; // koʻchirilgan joyda boshqa binolar
      }
      return d;
    }
    case 'setContext': {
      const { layers, ...rest } = c.patch;
      const cx = { ...doc.context, ...rest, layers: { ...doc.context.layers, ...(layers || {}) } };
      if (!(cx.radius >= CTX_R_MIN && cx.radius <= CTX_R_MAX)) throw new CommandError('Radius 100–6000 m oraligʻida boʻlsin');
      if (cx.area && cx.area.length < 3) throw new CommandError('Atrof chegarasi kamida 3 nuqta');
      d.context = cx; return d;
    }
    case 'setSite': {
      if (!c.rings.length || c.rings.some(r => r.length < 3)) throw new CommandError('Chegara kamida 3 nuqtadan iborat boʻlsin');
      d.site = { rings: c.rings.map(copyRing) }; return d;
    }
    case 'clearSite': d.site = null; return d;
    case 'addBuilding': {
      if (c.footprint.length < 3) throw new CommandError('Bino dogʻi kamida 3 nuqta');
      const floors = Math.max(1, Math.round(c.floors));
      d.buildings = [...doc.buildings, { id: c.id ?? uid('b_'), footprint: copyRing(c.footprint), floors, nonRes: Math.max(0, Math.min(floors - 1, Math.round(c.nonRes ?? 0))), use: c.use ?? 'turar' }];
      return d;
    }
    case 'updateBuilding': {
      const i = doc.buildings.findIndex(b => b.id === c.id);
      if (i < 0) throw new CommandError('Bino topilmadi');
      const b = { ...doc.buildings[i], ...c.patch };
      b.floors = Math.max(1, Math.round(b.floors));
      b.nonRes = b.gen?.kind === 'stilobat' ? b.floors : Math.max(0, Math.min(b.floors - 1, Math.round(b.nonRes)));
      if (c.patch.footprint) b.footprint = copyRing(c.patch.footprint);
      d.buildings = doc.buildings.slice(); d.buildings[i] = b; return d;
    }
    case 'removeBuilding': d.buildings = doc.buildings.filter(b => b.id !== c.id); return d;
    case 'deleteSelection': {
      const ids = new Set(c.ids); d.buildings = doc.buildings.filter(b => !ids.has(b.id));
      const rm = [...new Set([...(doc.removed ?? []), ...c.ctx])]; if (rm.length) d.removed = rm;
      if (c.ctx.length) { d.keep = doc.keep.filter(k => !c.ctx.includes(k)); if (doc.keepAt) { const at = { ...doc.keepAt }; for (const k of c.ctx) delete at[k]; d.keepAt = at; } if (doc.keepRings) { const rg = { ...doc.keepRings }; for (const k of c.ctx) delete rg[k]; d.keepRings = rg; } } return d;
    }
    case 'setRemoved': { if (c.removed.length) d.removed = [...new Set(c.removed)]; else delete d.removed; return d; }
    case 'setRemovedRoads': { if (c.ids.length) d.removedRoads = [...new Set(c.ids)]; else delete d.removedRoads; return d; }
    case 'addStreet': {
      if (c.axis.length < 2) throw new CommandError('Koʻcha kamida 2 nuqtadan iborat boʻlsin');
      d.streets = [...doc.streets, { id: c.id ?? uid('s_'), axis: c.axis.map(p => [p[0], p[1]] as LngLat), profile: c.profile, ...(c.osm != null ? { osm: c.osm } : {}) }]; return d;
    }
    case 'updateStreet': {
      const i = doc.streets.findIndex(s => s.id === c.id); if (i < 0) throw new CommandError('Koʻcha topilmadi');
      const s = { ...doc.streets[i], ...c.patch }; if (s.axis.length < 2) throw new CommandError('Koʻcha kamida 2 nuqtadan iborat boʻlsin');
      d.streets = doc.streets.slice(); d.streets[i] = s; return d;
    }
    case 'updateStreets': {   // bir nechta koʻcha — bitta oʻzgarish (sahna bir marta qayta quriladi)
      const m = new Map(c.patches.map(q => [q.id, q.patch]));
      d.streets = doc.streets.map(s => { const q = m.get(s.id); if (!q) return s; const n = { ...s, ...q }; if (n.axis.length < 2) throw new CommandError('Koʻcha kamida 2 nuqtadan iborat boʻlsin'); return n; }); return d;
    }
    case 'removeStreet': {
      // OSM dan olingan koʻcha oʻchirilsa — asl OSM yoʻli ham olib tashlangan hisoblanadi; aks holda u qayta paydo boʻlib,
      // shu joyga chizilgan yangi koʻcha ostida «eski yoʻl konturi» boʻlib qolardi (27.10, tester izohi)
      const st = doc.streets.find(s => s.id === c.id);
      d.streets = doc.streets.filter(s => s.id !== c.id);
      if (st?.osm != null) d.removedRoads = [...new Set([...(doc.removedRoads ?? []), st.osm])];
      return d;
    }
    case 'setGridStreets': {   // patches — uchlarni yoʻllarga ulash (shu buyruqda: tarixda bitta qadam, sahna bir marta)
      const had = new Set(doc.streets.map(s => s.osm).filter(x => x != null));
      const ad = (c.adopt ?? []).filter(a => !had.has(a.osm) && a.axis.length >= 2).map(a => ({ id: a.id ?? uid('s_'), axis: a.axis.map(p => [p[0], p[1]] as LngLat), profile: a.profile, osm: a.osm }));
      d.streets = [...doc.streets.filter(s => s.gen !== 'grid'), ...ad, ...c.streets.map(s => ({ id: s.id ?? uid('s_'), axis: s.axis.map(p => [p[0], p[1]] as LngLat), profile: s.profile, gen: 'grid' as const }))];
      if (c.patches?.length) { const m = new Map(c.patches.map(q => [q.id, q.patch])); d.streets = d.streets.map(s => { const q = m.get(s.id); return q && (q.axis ?? s.axis).length >= 2 ? { ...s, ...q } : s; }); }
      return d;
    }
    case 'setZones': d.zones = c.zones.map(z => ({ ...z, at: [z.at[0], z.at[1]] as LngLat })); return d;
    case 'setKeep': { d.keep = [...new Set(c.keep)]; const prev = { ...doc.keepAt, ...c.at }, at: Record<string, LngLat> = {}; for (const k of d.keep) if (prev[k]) at[k] = prev[k]; if (Object.keys(at).length) d.keepAt = at; else delete d.keepAt;
      const pr = { ...doc.keepRings, ...c.rings }, rg: Record<string, Ring> = {}; for (const k of d.keep) if (pr[k]) rg[k] = pr[k]; if (Object.keys(rg).length) d.keepRings = rg; else delete d.keepRings; return d; }
    case 'addPoi': d.pois = [...doc.pois, { ...c.poi, at: [c.poi.at[0], c.poi.at[1]] }]; return d;
    case 'removePoi': d.pois = doc.pois.filter(x => x.id !== c.id); return d;
    case 'styleBuildings': { const ids = new Set(c.ids); d.buildings = doc.buildings.map(b => ids.has(b.id) ? { ...b, ...(c.mat ? { mat: c.mat } : {}), ...(c.roof ? { roof: c.roof } : {}), ...(c.win ? { win: c.win === 'yoq' ? undefined : c.win } : {}), ...(c.bal ? (c.bal === 'yoq' ? { bal: undefined } : { bal: c.bal }) : {}), ...(c.parapet != null ? { parapet: c.parapet || undefined } : {}), ...(c.shade ? { shade: c.shade === 'yoq' ? undefined : c.shade } : {}), ...(c.winPat ? { winPat: c.winPat === 'qator' ? undefined : c.winPat } : {}), ...(c.balPat ? { balPat: c.balPat === 'har2' ? undefined : c.balPat } : {}) } : b); return d; }
    case 'setChizmadon': d.chizmadon = JSON.parse(JSON.stringify(c.data)); return d;
    case 'addUserLayer': {
      const L = doc.userLayers ?? [];
      if (L.some(x => x.id === c.meta.id)) throw new CommandError('Bu qatlam allaqachon bor');
      if (L.length >= 40) throw new CommandError('Qatlamlar soni 40 tadan oshmasin');
      d.userLayers = [...L, JSON.parse(JSON.stringify(c.meta))]; return d;
    }
    case 'updateUserLayer': {
      const L = doc.userLayers ?? [], i = L.findIndex(x => x.id === c.id);
      if (i < 0) throw new CommandError('Qatlam topilmadi');
      const m = { ...L[i], ...JSON.parse(JSON.stringify(c.patch)) };
      if (m.opacity != null) m.opacity = Math.max(0, Math.min(1, m.opacity));
      // alohida ranglar: patch da `overrides` aniq berilib boʻsh boʻlsa — hammasi tiklanadi (JSON undefined ni tashlaydi)
      if ('overrides' in c.patch && (!c.patch.overrides || !Object.keys(c.patch.overrides).length)) delete m.overrides;
      d.userLayers = L.slice(); d.userLayers[i] = m; return d;
    }
    case 'removeUserLayer': {
      const L = (doc.userLayers ?? []).filter(x => x.id !== c.id);
      if (L.length) d.userLayers = L; else delete d.userLayers;
      return d;
    }
    case 'setSheets': { if (c.sheets) d.sheets = c.sheets.map(x => ({ id: x.id, opts: JSON.parse(JSON.stringify(x.opts)) })); if (c.styles) d.sheetStyles = c.styles.map(x => ({ ...x, opts: JSON.parse(JSON.stringify(x.opts)) })); return d; }
    case 'addView': d.views = [...doc.views, { ...c.view, pos: [...c.view.pos] as SavedView['pos'], target: [...c.view.target] as SavedView['target'] }]; return d;
    case 'removeView': d.views = doc.views.filter(x => x.id !== c.id); return d;
    case 'setParcels': {
      d.parcels = [...doc.parcels.filter(p => p.block !== c.block), ...c.parcels.map(p => ({ id: p.id, block: c.block, rings: p.rings.map(copyRing), use: p.use }))];
      // shu kvartaldagi eski parsellarning seksiyalari yaroqsiz — olib tashlanadi
      const gone = new Set(doc.parcels.filter(p => p.block === c.block && !c.parcels.some(q => q.id === p.id)).map(p => p.id));
      if (gone.size) { d.buildings = doc.buildings.filter(b => !b.gen || !gone.has(b.gen.grp)); d.garages = doc.garages.filter(g => !gone.has(g.grp)); }
      if (c.label) { const z = c.label; d.zones = [...doc.zones.filter(q => q.id !== z.id), { ...z, at: [z.at[0], z.at[1]] as LngLat }]; }
      return d;
    }
    case 'updateParcel': {
      const i = doc.parcels.findIndex(p => p.id === c.id); if (i < 0) throw new CommandError('Parsel topilmadi');
      d.parcels = doc.parcels.slice(); d.parcels[i] = { ...doc.parcels[i], ...c.patch }; return d;
    }
    case 'replaceGroup': {
      const dropB = new Set(c.drop?.bids ?? []), dropG = new Set(c.drop?.gids ?? []);
      const keep = doc.buildings.filter(b => b.gen?.grp !== c.grp && !(b.gen && dropB.has(b.id)));
      d.buildings = [...keep, ...c.sections.map(x => {
        const floors = Math.max(1, Math.round(x.floors));
        return { id: uid('b_'), footprint: copyRing(x.footprint), floors, nonRes: x.kind === 'stilobat' ? floors : Math.max(0, Math.min(floors - 1, Math.round(x.nonRes))), use: x.use, gen: { grp: c.grp, kind: x.kind }, ...(x.z0 ? { z0: x.z0 } : {}) };
      })];
      d.garages = [...doc.garages.filter(g => g.grp !== c.grp && !dropG.has(g.id)), ...(c.garage ? [{ ...c.garage, id: uid('g_'), grp: c.grp, ring: copyRing(c.garage.ring), ...(c.garage.stalls ? { stalls: c.garage.stalls.map(copyRing) } : {}), ...(c.garage.aisles ? { aisles: c.garage.aisles.map(copyRing) } : {}) }] : [])];
      if (c.parcelGen) d.parcels = doc.parcels.map(p => p.id === c.grp ? { ...p, gen: { ...c.parcelGen } } : p);
      if (c.label) { const z = c.label; d.zones = [...doc.zones.filter(q => q.id !== z.id), { ...z, at: [z.at[0], z.at[1]] as LngLat }]; }
      return d;
    }
    case 'setSettings': {
      const s = { ...doc.settings, ...c.patch };
      for (const k of ['seismic', 'm2PerPerson', 'netToGross', 'floorHeight', 'aptNet'] as const) if (!(s[k] > 0)) throw new CommandError(`${k} musbat boʻlsin`);
      if (s.aptMix.length !== 4 || s.aptMix.some(v => !(v >= 0)) || !s.aptMix.some(v => v > 0)) throw new CommandError('Kvartira miksi notoʻgʻri');
      d.settings = s; return d;
    }
  }
}
