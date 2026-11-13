/* Prompt kompilyatori (Render 1-bosqich, 13.11.2026). Brauzer tugmalar holatini yuboradi, matn faqat shu yerda yigʻiladi.
   Shablon tartibi (oʻzgartirmang — snapshot testi bor):
     1 kirish turi → 2 yorugʻlik → 3 kontekst → 4 material → (foydalanuvchi qoʻshimchasi) → 5 geometriyani saqlash bandi → 6 sifat
   Referenslar oʻz bandiga tushadi: yorugʻlik referensi — 2-bandga, kontekst — 3, material — 4, uslub — 6.
   Geometriya bandi foydalanuvchi matnidan KEYIN turadi: matn binolar soni yoki kadrni oʻzgartira olmaydi. */

export class PromptError extends Error { constructor(msg) { super(msg); this.code = 'bad_params'; } }

/** 1 — nima tasvirlangan (kirish turi) */
export const SUBJECT = Object.freeze({
  reja: 'an urban master plan / city block shown as a 3D massing model (buildings, streets, trees)',
  bino: 'a single building shown as an architectural 3D massing model with windows, balconies and roof',
  kocha: 'a street cross-section / streetscape (road lanes, sidewalks, trees, building frontages)',
  joy: 'an axonometric urban site analysis model (terrain, streets, buildings, greenery)',
  interyer: 'an interior space (3D model or photo of a room)',
  eskiz: 'an architectural hand sketch or line drawing',
});

/** Uslublar — brauzerdagi STY roʻyxati bilan bir xil id; har biri bandlarga ajratilgan */
export const STYLE = Object.freeze({
  foto: { light: 'clear daytime sky, soft natural sunlight with crisp realistic shadows', context: 'people walking, street trees with full foliage, cars on the streets', material: 'realistic facade and ground materials', look: 'photorealistic architectural visualization' },
  oltin: { light: 'golden hour: warm low sun, long soft shadows, glowing windows, light atmospheric haze', context: 'calm street life, trees in full foliage', material: 'realistic materials catching warm light', look: 'photorealistic architectural visualization' },
  kech: { light: 'dusk / blue hour: deep blue sky, warm interior lights in windows, street lamps on', context: 'evening street life, car light trails', material: 'realistic materials with reflections of artificial light', look: 'photorealistic architectural visualization' },
  qish: { light: 'overcast soft winter light', context: 'light snow on roofs and ground, bare deciduous trees, people in winter clothes', material: 'realistic wet and snowy surfaces', look: 'photorealistic architectural visualization' },
  toshkent: { light: 'warm continental summer light, light dust haze', context: 'Tashkent, Uzbekistan: plane trees (chinar) and mulberry along streets, open irrigation ditches (ariq), local people, Central Asian urban context', material: 'local brick, light plaster and concrete facades', look: 'photorealistic architectural visualization' },
  akvarel: { light: 'soft diffuse daylight', context: 'sparse hand-drawn trees and figures', material: 'soft washes of colour on white paper', look: 'loose architectural watercolor sketch with ink linework, hand-drawn feel' },
  maket: { light: 'soft studio lighting, shallow depth of field', context: 'no people, plain studio background', material: 'matte white card and light wood', look: 'photograph of a physical architectural scale model' },
  diagramma: { light: 'flat even lighting, minimal shading', context: 'no people, no cars', material: 'flat pastel colours with thin dark outlines', look: 'clean architectural diagram illustration' },
});

export const FIDELITY = Object.freeze({
  qatiy: 'GEOMETRY (highest priority, overrides everything above): keep EXACTLY the same camera angle, framing, composition and perspective. Keep every building in the same position with the same footprint, height, number of floors, roof shape and window rhythm; keep the street layout and block shapes. Do not add or remove buildings.',
  muvozanat: 'GEOMETRY: keep the camera angle, composition, building positions, heights and overall massing. You may refine facade details, openings and materials, and add landscaping, people and street life.',
  erkin: 'GEOMETRY: use the base image as a loose composition guide only: keep the general layout and viewpoint; architectural details, materials and surroundings may be reinterpreted.',
});

const REF = Object.freeze({
  yorugik: (n) => `match the time of day, sun direction, sky and atmosphere of image ${n} (lighting reference)`,
  kontekst: (n) => `use the vegetation, people, street furniture and surroundings of image ${n} (context reference)`,
  material: (n) => `use the facade and ground materials, textures and colours of image ${n} (material reference)`,
  uslub: (n) => `match the rendering style, colour grading and mood of image ${n} (style reference)`,
});
export const REF_ROLES = Object.freeze(Object.keys(REF));

const QUALITY = 'High resolution, sharp details, correct perspective, no distortion. Do not add any text, labels, watermarks or borders.';
const MAX_EXTRA = 400;

/** Sahna faktlari (Master reja): son bilan — geometriya bandiga qoʻshiladi. Faqat butun sonlar, chegaralangan. */
function factsLine(f) {
  if (!f || typeof f !== 'object') return '';
  const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
  const n = int(f.buildings, 1, 500), lo = int(f.floorsMin, 1, 120), hi = int(f.floorsMax, 1, 120);
  const parts = [];
  if (n) parts.push(`exactly ${n} building${n > 1 ? 's' : ''}`);
  if (lo && hi) parts.push(lo === hi ? `${lo} floors each` : `${lo} to ${hi} floors`);
  return parts.length ? ` The scene contains ${parts.join(', ')}.` : '';
}

/** Foydalanuvchi matni: boshqaruv belgilari olib tashlanadi, qisqartiriladi */
export function cleanExtra(s) {
  if (s == null) return '';
  if (typeof s !== 'string') throw new PromptError('soʻrov matni notoʻgʻri');
  return s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_EXTRA);
}

/**
 * @param {{subj:string, style?:string, fid?:string, refs?:string[], extra?:string, facts?:object}} p
 * @returns {string}
 */
export function compilePrompt(p) {
  const subj = SUBJECT[p?.subj];
  if (!subj) throw new PromptError('nima tasvirlangani notoʻgʻri');
  const sty = p.style ? STYLE[p.style] : null;
  if (p.style && !sty) throw new PromptError('uslub notoʻgʻri');
  const fid = FIDELITY[p.fid ?? 'qatiy'];
  if (!fid) throw new PromptError('sodiqlik notoʻgʻri');
  const roles = p.refs ?? [];
  if (!Array.isArray(roles) || roles.length > 4 || roles.some((r) => !REF[r])) throw new PromptError('referens rollari notoʻgʻri');
  const by = (role) => roles.map((r, i) => (r === role ? REF[r](i + 2) : null)).filter(Boolean);
  const slot = (label, base, role) => {
    const xs = [base, ...by(role)].filter(Boolean);
    return xs.length ? ` ${label}: ${xs.join('; ')}.` : '';
  };
  const extra = cleanExtra(p.extra);
  return [
    `${roles.length ? 'Image 1 is the BASE image. ' : ''}INPUT: the base image is ${subj}. Turn it into a finished image.`,
    slot('LIGHTING', sty?.light, 'yorugik'),
    slot('CONTEXT', sty?.context, 'kontekst'),
    slot('MATERIALS', sty?.material, 'material'),
    extra ? ` ADDITIONAL: ${extra}.` : '',
    ` ${fid}${factsLine(p.facts)}`,
    ` QUALITY: ${[sty?.look ?? 'high-quality architectural visualization', ...by('uslub')].join('; ')}. ${QUALITY}`,
  ].join('');
}
