/**
 * Agent sikli (brauzerda): yurish → model qadami → buyruqlar shu yerda bajariladi → natija qaytariladi → …
 * Hisoblar brauzerda, modelga faqat buyruq natijasi (qisqartirilgan JSON) ketadi. Model loyihani oʻzgartira olmaydi:
 * buyruqlar faqat oʻqiydi (tools-*.ts).
 */
import type { AgentApi, Block, Msg, RunRes } from './api';

export type ToolFn = (input: Record<string, unknown>) => unknown | Promise<unknown>;
export type Tools = Record<string, ToolFn>;

export interface LoopEvents {
  /** buyruq boshlandi / tugadi */
  onTool?(name: string, state: 'run' | 'ok' | 'err'): void;
  /** yurish boshlandi (tanga / bepul savol hal boʻldi) */
  onRun?(r: RunRes): void;
}
export interface LoopOpts {
  api: AgentApi; scenario: string; question: string; lang: string; tools: Tools;
  project?: string | null; areaHa?: number;
  /** oldingi savol-javoblar (faqat matn) — kontekst uchun */
  history?: { q: string; a: string }[];
  signal?: AbortSignal; ev?: LoopEvents;
}
export interface LoopRes { text: string; tools: string[]; status: 'done' | 'limit' | 'stopped'; run: RunRes; unsourced?: string[] }

/** Buyruq natijasi modelga: JSON, 30 000 belgigacha */
export const MAX_RESULT = 30_000;
export function encodeResult(v: unknown): string {
  let s: string;
  try { s = JSON.stringify(v ?? null); } catch { s = '"natija JSON ga oʻgirilmadi"'; }
  return s.length > MAX_RESULT ? s.slice(0, MAX_RESULT) + '…(qisqartirildi)' : s;
}

export async function runAgent(o: LoopOpts): Promise<LoopRes> {
  const run = await o.api.run(o.scenario, o.project, o.areaHa ?? 0);
  o.ev?.onRun?.(run);
  const msgs: Msg[] = [];
  for (const h of (o.history ?? []).slice(-2)) { msgs.push({ role: 'user', content: h.q }); msgs.push({ role: 'assistant', content: h.a }); }
  msgs.push({ role: 'user', content: o.question });
  const used: string[] = [];
  let text = '';
  for (;;) {
    if (o.signal?.aborted) return { text, tools: used, status: 'stopped', run };
    const r = await o.api.step(run.run, msgs, o.lang, o.signal);
    const keep = r.content.filter(b => b.type !== 'text' || b.text.trim());   // server boʻsh matnli blokni qabul qilmaydi
    msgs.push({ role: 'assistant', content: keep.length ? keep : [{ type: 'text', text: '…' }] });
    const t = r.content.filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text').map(b => b.text).join('\n\n').trim();
    if (t) text = t;
    const calls = r.content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
    if (r.stop !== 'tool_use' || !calls.length) return { text, tools: used, status: 'done', run, ...(r.unsourced?.length ? { unsourced: r.unsourced } : {}) };
    if (r.status !== 'open' || r.stepsLeft <= 0) return { text, tools: used, status: 'limit', run };
    const results: Block[] = [];
    for (const c of calls) {
      used.push(c.name);
      const fn = o.tools[c.name];
      o.ev?.onTool?.(c.name, 'run');
      try {
        if (!fn) throw new Error(`buyruq bu xizmatda yoʻq: ${c.name}`);
        const v = await fn(c.input ?? {});
        results.push({ type: 'tool_result', tool_use_id: c.id, content: encodeResult(v) });
        o.ev?.onTool?.(c.name, 'ok');
      } catch (e) {
        results.push({ type: 'tool_result', tool_use_id: c.id, content: encodeResult({ error: (e as Error)?.message ?? String(e) }), is_error: true });
        o.ev?.onTool?.(c.name, 'err');
      }
    }
    msgs.push({ role: 'user', content: results });
  }
}
