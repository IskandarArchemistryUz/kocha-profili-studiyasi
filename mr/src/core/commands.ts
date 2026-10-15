/**
 * Buyruqlar — hujjatni oʻzgartirishning yagona yoʻli.
 * Har bir buyruq sof funksiya: (hujjat, buyruq) → yangi hujjat. Eski hujjat oʻzgarmaydi —
 * shu sabab undo/redo oddiy: oldingi hujjatga qaytish kifoya.
 */
import { type Building, type LngLat, type Project, type Ring, type Settings, uid } from './doc';

export type Command =
  | { type: 'rename'; name: string }
  | { type: 'setOrigin'; origin: LngLat }
  | { type: 'setSite'; rings: Ring[] }
  | { type: 'clearSite' }
  | { type: 'addBuilding'; footprint: Ring; floors: number; nonRes?: number; use?: Building['use']; id?: string }
  | { type: 'updateBuilding'; id: string; patch: Partial<Omit<Building, 'id'>> }
  | { type: 'removeBuilding'; id: string }
  | { type: 'setSettings'; patch: Partial<Settings> };

/** Tarixda koʻrinadigan nom */
export function label(c: Command): string {
  switch (c.type) {
    case 'rename': return 'Nom oʻzgardi';
    case 'setOrigin': return 'Hudud markazi';
    case 'setSite': return 'Uchastka chegarasi';
    case 'clearSite': return 'Uchastka oʻchirildi';
    case 'addBuilding': return 'Bino qoʻshildi';
    case 'updateBuilding': return 'Bino oʻzgardi';
    case 'removeBuilding': return 'Bino oʻchirildi';
    case 'setSettings': return 'Sozlamalar';
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
      b.nonRes = Math.max(0, Math.min(b.floors - 1, Math.round(b.nonRes)));
      if (c.patch.footprint) b.footprint = copyRing(c.patch.footprint);
      d.buildings = doc.buildings.slice(); d.buildings[i] = b; return d;
    }
    case 'removeBuilding': d.buildings = doc.buildings.filter(b => b.id !== c.id); return d;
    case 'setSettings': {
      const s = { ...doc.settings, ...c.patch };
      for (const k of ['seismic', 'm2PerPerson', 'netToGross', 'floorHeight'] as const) if (!(s[k] > 0)) throw new CommandError(`${k} musbat boʻlsin`);
      d.settings = s; return d;
    }
  }
}
