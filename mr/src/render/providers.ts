/**
 * AI render provayderlari — eski js/ai-render.js dan koʻchirildi (0-qoida: hamma imkoniyat saqlanadi).
 * Foydalanuvchining oʻz API kaliti bilan, brauzerdan toʻgʻridan-toʻgʻri provayderga; serverimiz yoʻq.
 * Sozlamalar kaliti «kps_air» — eski sahifalar (bino.html, muharrir.html) bilan umumiy: kalit qayta kiritilmaydi.
 */
export type ProvId = 'gemini' | 'openai' | 'openrouter';
export const PROV: Record<ProvId, { n: string; models: string[]; key: string }> = {
  gemini: { n: 'Google Gemini (Nano Banana)', models: ['gemini-nano-banana-2.1', 'gemini-3-pro-image', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image'], key: 'https://aistudio.google.com/apikey' },
  openai: { n: 'OpenAI (GPT Image)', models: ['gpt-image-2', 'gpt-image-1'], key: 'https://platform.openai.com/api-keys' },
  openrouter: { n: 'OpenRouter (boshqa modellar)', models: ['google/gemini-2.5-flash-image', 'openai/gpt-image-1'], key: 'https://openrouter.ai/keys' },
};
export const STY: [string, string, string][] = [
  ['foto', 'Fotorealistik kunduz', 'photorealistic daytime architectural visualization, clear sky, soft natural sunlight, realistic materials, people walking, street trees with full foliage, cars on the streets'],
  ['oltin', 'Oltin soat', 'photorealistic architectural visualization at golden hour, warm low sun, long soft shadows, glowing windows, atmospheric haze'],
  ['kech', 'Kechki chiroqlar', 'photorealistic dusk / blue hour visualization, warm interior lights in windows, street lamps on, deep blue sky'],
  ['qish', 'Qish', 'photorealistic winter scene, light snow on roofs and ground, bare deciduous trees, overcast soft light'],
  ['toshkent', 'Toshkent ruhida', 'photorealistic visualization set in Tashkent, Uzbekistan: plane trees (chinar) and mulberry along streets, open irrigation ditches (ariq), warm continental summer light, local people, light dust haze, Central Asian context'],
  ['akvarel', 'Akvarel eskiz', 'loose architectural watercolor sketch with ink linework, white paper background, soft washes of color, hand-drawn feel'],
  ['maket', 'Oq maket (fotosi)', 'photograph of a physical white architectural scale model made of matte card and wood, studio lighting, shallow depth of field'],
  ['diagramma', 'Diagramma', 'clean architectural diagram illustration, flat pastel colors, thin dark outlines, minimal shading, no people'],
];
/** Nima tasvirlangan — soʻrovdagi ibora */
export type Subject = 'reja' | 'bino' | 'kocha' | 'joy' | 'interyer' | 'eskiz';
const WHAT: Record<Subject, string> = {
  reja: 'an urban master plan / city block (3D massing model of buildings, streets, trees)',
  bino: 'a single building (architectural 3D massing with windows, balconies and roof)',
  kocha: 'a street cross-section / streetscape (road lanes, sidewalks, trees, building frontages)',
  joy: 'an axonometric urban site analysis model (terrain, streets, buildings, greenery)',
  interyer: 'an interior space (3D model or photo of a room)',
  eskiz: 'an architectural hand sketch or line drawing',
};
export const SUBJECTS: [Subject, string][] = [['reja', 'Master reja'], ['bino', 'Bitta bino'], ['kocha', 'Koʻcha'], ['joy', 'Aksonometriya'], ['interyer', 'Interyer'], ['eskiz', 'Eskiz / qoʻl chizma']];
/** Asosga sodiqlik — Magnific «oʻxshashlik» sozlagichi oʻrnida (bu modellarda son bilan emas, soʻrov bilan boshqariladi) */
export type Fidelity = 'qatiy' | 'muvozanat' | 'erkin';
export const FIDELITY: [Fidelity, string][] = [['qatiy', 'Qatʼiy'], ['muvozanat', 'Muvozanat'], ['erkin', 'Erkin']];
const FID: Record<Fidelity, string> = {
  qatiy: 'Keep EXACTLY the same camera angle, framing, composition and perspective. Keep every building in the same position with the same footprint, height, number of floors, roof shape and window rhythm; keep the street layout and block shapes. Do not add or remove buildings.',
  muvozanat: 'Keep the camera angle, composition, building positions, heights and overall massing. You may refine facade details, openings and materials, and add landscaping, people and street life.',
  erkin: 'Use the base image as a loose composition guide only: keep the general layout and viewpoint, but you may reinterpret architectural details, materials and surroundings freely.',
};
/** Referens rasm roli */
export type RefRole = 'uslub' | 'material' | 'yorugik' | 'kontekst';
export const ROLES: [RefRole, string][] = [['uslub', 'Uslub'], ['material', 'Material'], ['yorugik', 'Yorugʻlik'], ['kontekst', 'Kontekst']];
const ROLE: Record<RefRole, string> = {
  uslub: 'a STYLE reference: match its rendering style, colour grading and mood',
  material: 'a MATERIAL reference: use its facade and ground materials, textures and colours',
  yorugik: 'a LIGHTING reference: match its time of day, sun direction, sky and atmosphere',
  kontekst: 'a CONTEXT reference: use its vegetation, people, street furniture and surroundings',
};
export interface Ref { img: string; role: RefRole }

export interface AirState { prov: ProvId; model: Partial<Record<ProvId, string>>; key: Partial<Record<ProvId, string>>; sty: string; extra: string; keep: boolean; fid?: Fidelity; subj?: Subject; n?: number }
const KEY = 'kps_air';
export function loadState(): AirState {
  const s: AirState = { prov: 'gemini', model: {}, key: {}, sty: 'foto', extra: '', keep: true };
  try { Object.assign(s, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* */ }
  if (!(s.prov in PROV)) s.prov = 'gemini';
  return s;
}
export function saveState(s: AirState): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ } }
export const modelOf = (s: AirState) => (s.model[s.prov] || PROV[s.prov].models[0]).trim();

/** Soʻrov: 1-rasm — asos; keyingilari — referenslar (rollari bilan). Uslub tanlanmasa ('') — faqat referens va matn. */
export function buildPrompt(s: AirState, subj: Subject, roles: RefRole[] = []): string {
  const st = STY.find(x => x[0] === s.sty);
  const fid = s.fid ?? (s.keep === false ? 'muvozanat' : 'qatiy');
  const refs = roles.map((r, i) => ` Image ${i + 2} is ${ROLE[r]}; do not copy its content or geometry.`).join('');
  return `${roles.length ? 'The first image is the BASE image: ' : ''}Transform this ${subj === 'eskiz' ? 'drawing' : 'image'} of ${WHAT[subj]} into ${st ? st[2] : 'a high-quality architectural visualization'}.`
    + refs + ' ' + FID[fid]
    + ' Do not add any text, labels, watermarks or borders.' + (s.extra.trim() ? ' Additional instructions: ' + s.extra.trim() : '');
}

export const ARS: [string, number][] = [['1:1', 1], ['4:3', 4 / 3], ['3:2', 1.5], ['16:9', 16 / 9], ['21:9', 21 / 9], ['3:4', 0.75], ['2:3', 2 / 3], ['9:16', 9 / 16]];
export const nearAR = (a: number) => ARS.reduce((b, x) => Math.abs(Math.log(x[1] / a)) < Math.abs(Math.log(b[1] / a)) ? x : b)[0];
export function openaiSize(a: number): string { return a > 1.2 ? '1536x1024' : a < 0.83 ? '1024x1536' : '1024x1024'; }

export interface Img { url: string; w: number; h: number }
/** Rasm: uzun tomoni max px, JPEG, oq fon */
export function shrink(src: string, max = 1536): Promise<Img> {
  return new Promise((ok, no) => {
    const im = new Image();
    im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); ok({ url: c.toDataURL('image/jpeg', 0.92), w: c.width, h: c.height }); };
    im.onerror = () => no(new Error('rasm ochilmadi')); im.src = src;
  });
}

type F = typeof fetch;
async function jfetch(f: F, url: string, opt: RequestInit): Promise<any> {
  const r = await f(url, opt), t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { /* */ }
  if (!r.ok) { const m = (j && (j.error && (j.error.message || j.error) || j.message)) || t.slice(0, 300); throw new Error(`${r.status} ${typeof m === 'string' ? m : JSON.stringify(m)}`); }
  return j;
}
export class NoImage extends Error {}
const b64 = (u: string) => u.split(',')[1];
export async function gemini(key: string, model: string, P: string, img: Img, f: F = fetch.bind(globalThis), refs: Img[] = []): Promise<string> {
  const ar = nearAR(img.w / img.h), imgs = [img, ...refs].map(i => ({ inline_data: { mime_type: 'image/jpeg', data: b64(i.url) } }));
  const body = (cfg: object) => JSON.stringify({ contents: [{ parts: [{ text: P }, ...imgs] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], ...cfg } });
  const url = (v: string) => `https://generativelanguage.googleapis.com/${v}/models/${encodeURIComponent(model)}:generateContent`;
  // rasm sozlamalari maydoni API versiyasiga qarab farq qiladi — ketma-ket urinib koʻriladi
  const tries: [string, object][] = [['v1beta', { imageConfig: { aspectRatio: ar } }], ['v1', { responseFormat: { image: { aspectRatio: ar } } }], ['v1beta', {}]];
  let last: Error | null = null;
  for (const [v, cfg] of tries) {
    try {
      const j = await jfetch(f, url(v), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: body(cfg) });
      const parts: any[] = j?.candidates?.[0]?.content?.parts ?? [];
      const p = parts.filter(p => (p.inlineData || p.inline_data) && !p.thought).pop();
      if (p) { const d = p.inlineData || p.inline_data; return `data:${d.mimeType || d.mime_type || 'image/png'};base64,${d.data}`; }
      const txt = parts.map(p => p.text).filter(Boolean).join(' ');
      throw new NoImage(txt.slice(0, 240));
    } catch (e) { last = e as Error; if (!/^40[04]\b/.test(last.message)) throw last; }
  }
  throw last!;
}
export async function openai(key: string, model: string, P: string, img: Img, f: F = fetch.bind(globalThis), refs: Img[] = []): Promise<string> {
  const fd = new FormData();
  fd.append('model', model); fd.append('prompt', P);
  const all = [img, ...refs];
  for (let i = 0; i < all.length; i++) fd.append(all.length > 1 ? 'image[]' : 'image', await (await f(all[i].url)).blob(), i ? `ref${i}.jpg` : 'base.jpg'); fd.append('size', openaiSize(img.w / img.h)); fd.append('n', '1');
  const j = await jfetch(f, 'https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd });
  const d = j?.data?.[0] ?? {}; if (d.b64_json) return 'data:image/png;base64,' + d.b64_json; if (d.url) return d.url as string;
  throw new NoImage('');
}
export async function openrouter(key: string, model: string, P: string, img: Img, f: F = fetch.bind(globalThis), refs: Img[] = []): Promise<string> {
  const j = await jfetch(f, 'https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, 'X-Title': 'Archemistry Lab' },
    body: JSON.stringify({ model, modalities: ['image', 'text'], messages: [{ role: 'user', content: [{ type: 'text', text: P }, ...[img, ...refs].map(i => ({ type: 'image_url', image_url: { url: i.url } }))] }] }) });
  const m = j?.choices?.[0]?.message ?? {}, im = m.images?.[0];
  if (im?.image_url?.url) return im.image_url.url as string;
  throw new NoImage(m.content ? String(m.content).slice(0, 240) : '');
}
export const RUN: Record<ProvId, typeof gemini> = { gemini, openai, openrouter };
