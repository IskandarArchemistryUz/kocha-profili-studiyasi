/** 14.11 (egasi): Chizmadonning oʻz loyihalari (Project.svc = 'chz') — «Loyihalar» oynasi; Master reja loyihalari bu yerda koʻrinmaydi */
import { tr } from '../i18n';
import { blankProject, type Project } from '../core/doc';
import { listProjects, putProject, deleteProject } from '../storage/db';
import { openProjects } from './projwin';

/** Chizmadon oynasi muharrir ustida ochiq — toza ochilishi uchun sahifa yangilanadi */
const go = (id: string) => { const h = `#/p/${id}/chizmadon`; if (location.hash === h) location.reload(); else location.hash = h; };

export function openChzProjects(cur?: string, gate = false): Promise<void> {
  return openProjects({
    svc: 'chz', gate, name: 'Chizmadon', lead: 'Taqdimot albomlari: har loyiha — oʻz varaqlari. Master reja albomi — Master reja loyihasining ichida.',
    list: async () => (await listProjects()).filter(p => p.svc === 'chz').map(p => ({ id: p.id, name: p.name, updated: p.updated, cur: p.id === cur })),
    create: async () => { const p: Project = { ...blankProject(tr('Taqdimot albomi')), svc: 'chz' }; await putProject(p); go(p.id); },
    open: id => go(id),
    remove: async id => { await deleteProject(id); },
  });
}
