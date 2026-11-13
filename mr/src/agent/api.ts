/** Agent «Maslahatchi» — server chaqiruvlari (server/src/agent.js). Sessiya cookie da (credentials: include). */
import { apiBase } from '../account/config';
import { ApiError } from '../account/session';

export interface Scenario { svc: string; tier: 'short' | 'long'; coins: number }
export interface AgentCfg {
  enabled: boolean; services: string[]; scenarios: Record<string, Scenario>;
  freePerWeek: number; maxSteps: number; freeLeft?: number; owner?: boolean;
}
export interface RunRes { run: string; free: boolean; charged: number; capped: boolean; balance: number; freeLeft: number; maxSteps: number }
export type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
export interface Msg { role: 'user' | 'assistant'; content: string | Block[] }
export interface StepRes { content: Block[]; stop: string; status: 'open' | 'done' | 'limit'; stepsLeft: number }

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let r: Response;
  try {
    r = await fetch(apiBase() + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', signal,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError('offline', 'Server bilan aloqa yoʻq. Internetni tekshiring yoki birozdan keyin urinib koʻring.');
  }
  const j = await r.json().catch(() => ({})) as { error?: string; message?: string; need?: number; balance?: number };
  if (!r.ok) throw new ApiError(j.error ?? 'server', j.message ?? 'Server xatosi', r.status, { need: j.need, balance: j.balance });
  return j as T;
}

export interface ClauseRes { found: boolean; reason?: string; doc?: string; title?: string; edition?: string; source?: string; coverage?: string; clause?: string; text?: string; amend?: string[]; library?: string[] }

export interface AgentApi {
  config(): Promise<AgentCfg>;
  run(scenario: string, project?: string | null, areaHa?: number): Promise<RunRes>;
  step(run: string, messages: Msg[], lang: string, signal?: AbortSignal): Promise<StepRes>;
  /** band matni (server kutubxonasi, soʻzma-soʻz) */
  clause(doc: string, clause: string): Promise<ClauseRes>;
}

export const agentApi: AgentApi = {
  config: () => call<AgentCfg>('/agent/config'),
  run: (scenario, project, areaHa = 0) => call<RunRes>('/agent/run', { scenario, project: project ?? undefined, areaHa }),
  step: (run, messages, lang, signal) => call<StepRes>('/agent/step', { run, messages, lang }, signal),
  clause: (doc, clause) => call<ClauseRes>(`/agent/clause?doc=${encodeURIComponent(doc)}&clause=${encodeURIComponent(clause)}`),
};

/** Sozlama bir marta soʻraladi (sahifa davomida); xato — agent oʻchiq deb hisoblanadi */
let cfgP: Promise<AgentCfg | null> | null = null;
export function agentConfig(force = false): Promise<AgentCfg | null> {
  if (!cfgP || force) cfgP = agentApi.config().catch(() => null);
  return cfgP;
}
