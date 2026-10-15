/**
 * Buyruqlar — hujjatni oʻzgartirishning yagona yoʻli.
 * Har bir buyruq sof funksiya: (hujjat, buyruq) → yangi hujjat. Eski hujjat oʻzgarmaydi —
 * shu sabab undo/redo oddiy: oldingi hujjatga qaytish kifoya.
 */
import { type Building, type ContextSettings, type LngLat, type Project, type Ring, type Garage, type Parcel, type Settings, type Street, type ZoneLabel, uid } from './doc';
import { frame } from './geo';

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
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'addStreet'; axis: LngLat[]; profile: string; id?: string; osm?: number }
  | { type: 'updateStreet'; id: string; patch: Partial<Omit<Street, 'id'>> }
  | { type: 'removeStreet'; id: string }
  /** zona belgilarini toʻliq almashtirish (kvartalga tegishlilikni chaqiruvchi geometriya boʻyicha hal qiladi) */
  | { type: 'setZones'; zones: ZoneLabel[] }
  | { type: 'setKeep'; keep: number[] }
  /** kvartal parsellarini almashtirish (boʻlish, kesish, birlashtirish; boʻsh — kvartal butun) */
  | { type: 'setParcels'; block: string; parcels: Omit<Parcel, 'block'>[]; label?: ZoneLabel }
  | { type: 'updateParcel'; id: string; patch: Partial<Pick<Parcel, 'use'>> }
  /** generator natijasi: shu guruhdagi seksiyalarni almashtirish (boʻsh roʻyxat — tozalash); zona belgisiga parametrlar yoziladi */
  | { type: 'replaceGroup'; grp: string; sections: { footprint: Ring; floors: number; nonRes: number; use: Building['use']; kind: string; z0?: number }[]; label?: ZoneLabel; garage?: Omit<Garage, 'id' | 'grp'> | null };

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
    case 'setSettings': return 'Sozlamalar';
    case 'addStreet': return 'Koʻcha qoʻshildi';
    case 'updateStreet': return 'Koʻcha oʻzgardi';
    case 'removeStreet': return 'Koʻcha oʻchirildi';
    case 'setZones': return 'Zona';
    case 'setKeep': return 'Saqlanadigan binolar';
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
        d.garages = doc.garages.map(g => ({ ...g, ring: mv(g.ring) }));
        d.keep = []; // koʻchirilgan joyda boshqa binolar
      }
      return d;
    }
    case 'setContext': {
      const { layers, ...rest } = c.patch;
      const cx = { ...doc.context, ...rest, layers: { ...doc.context.layers, ...(layers || {}) } };
      if (!(cx.radius >= 100 && cx.radius <= 2000)) throw new CommandError('Radius 100–2000 m oraligʻida boʻlsin');
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
    case 'addStreet': {
      if (c.axis.length < 2) throw new CommandError('Koʻcha kamida 2 nuqtadan iborat boʻlsin');
      d.streets = [...doc.streets, { id: c.id ?? uid('s_'), axis: c.axis.map(p => [p[0], p[1]] as LngLat), profile: c.profile, ...(c.osm != null ? { osm: c.osm } : {}) }]; return d;
    }
    case 'updateStreet': {
      const i = doc.streets.findIndex(s => s.id === c.id); if (i < 0) throw new CommandError('Koʻcha topilmadi');
      const s = { ...doc.streets[i], ...c.patch }; if (s.axis.length < 2) throw new CommandError('Koʻcha kamida 2 nuqtadan iborat boʻlsin');
      d.streets = doc.streets.slice(); d.streets[i] = s; return d;
    }
    case 'removeStreet': d.streets = doc.streets.filter(s => s.id !== c.id); return d;
    case 'setZones': d.zones = c.zones.map(z => ({ ...z, at: [z.at[0], z.at[1]] as LngLat })); return d;
    case 'setKeep': d.keep = [...new Set(c.keep)]; return d;
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
      const keep = doc.buildings.filter(b => b.gen?.grp !== c.grp);
      d.buildings = [...keep, ...c.sections.map(x => {
        const floors = Math.max(1, Math.round(x.floors));
        return { id: uid('b_'), footprint: copyRing(x.footprint), floors, nonRes: x.kind === 'stilobat' ? floors : Math.max(0, Math.min(floors - 1, Math.round(x.nonRes))), use: x.use, gen: { grp: c.grp, kind: x.kind }, ...(x.z0 ? { z0: x.z0 } : {}) };
      })];
      d.garages = [...doc.garages.filter(g => g.grp !== c.grp), ...(c.garage ? [{ ...c.garage, id: uid('g_'), grp: c.grp, ring: copyRing(c.garage.ring) }] : [])];
      if (c.label) { const z = c.label; d.zones = [...doc.zones.filter(q => q.id !== z.id), { ...z, at: [z.at[0], z.at[1]] as LngLat }]; }
      return d;
    }
    case 'setSettings': {
      const s = { ...doc.settings, ...c.patch };
      for (const k of ['seismic', 'm2PerPerson', 'netToGross', 'floorHeight', 'aptNet'] as const) if (!(s[k] > 0)) throw new CommandError(`${k} musbat boʻlsin`);
      d.settings = s; return d;
    }
  }
}
