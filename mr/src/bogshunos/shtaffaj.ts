/**
 * Bogʻshunos — kesim shtaffaji (vaqtinchalik sxematik siluetlar).
 * Asl foydalanuvchi kutubxonasi (daraxt-kesim, bolalar, velosipedchi, sport, fonar — DWG/PNG dan vektorlangan) loyiha hujjatlarida yoʻq;
 * u kelguncha shu yerda oddiy geometrik siluetlar ishlatiladi (T). Nomlar asl kutubxona bilan bir xil — keyin fayl almashtiriladi.
 * Format: f — toʻldirilgan siluet, i — ichki shox chiziqlari, k — kontur; w, h — oʻlcham; (ox, oy) — asos (pastki markaz).
 */
export interface Sil { f: string; i: string; k: string; w: number; h: number; ox: number; oy: number }

const H = 100, OX = 50, OY = 100;
/** Toj (ellips / konus / kolonna / majnun) + tana */
function tree(kind: 'yumaloq' | 'keng' | 'konus' | 'kolonna' | 'majnun', cw: number): Sil {
  const r = cw / 2, top = 0, trunkTop = kind === 'konus' ? 82 : kind === 'kolonna' ? 88 : 62;
  let crown: string;
  if (kind === 'konus') crown = `M${OX} ${top}L${OX + r} ${trunkTop}L${OX - r} ${trunkTop}Z`;
  else if (kind === 'kolonna') crown = `M${OX} ${top}C${OX + r} ${top + 10} ${OX + r} ${trunkTop - 6} ${OX} ${trunkTop}C${OX - r} ${trunkTop - 6} ${OX - r} ${top + 10} ${OX} ${top}Z`;
  else if (kind === 'majnun') crown = `M${OX - r} 70C${OX - r} 10 ${OX + r} 10 ${OX + r} 70L${OX + r * 0.6} 58L${OX + r * 0.2} 72L${OX - r * 0.2} 58L${OX - r * 0.6} 72Z`;
  else { const cy = kind === 'keng' ? 34 : 32, ry = kind === 'keng' ? 32 : 30; crown = `M${OX - r} ${cy}A${r} ${ry} 0 1 1 ${OX + r} ${cy}A${r} ${ry} 0 1 1 ${OX - r} ${cy}Z`; }
  const trunk = `M${OX - 2.2} ${OY}L${OX - 1.6} ${trunkTop}L${OX + 1.6} ${trunkTop}L${OX + 2.2} ${OY}Z`;
  const br = kind === 'konus' || kind === 'kolonna' ? `M${OX} ${trunkTop}L${OX} ${top + 12}` : `M${OX} ${trunkTop}L${OX} ${trunkTop - 22}M${OX} ${trunkTop - 10}L${OX - r * 0.5} ${trunkTop - 30}M${OX} ${trunkTop - 14}L${OX + r * 0.5} ${trunkTop - 34}`;
  return { f: crown + trunk, i: br, k: crown, w: cw, h: H, ox: OX, oy: OY };
}
/** Odam / velosipedchi / fonar — oddiy toʻldirilgan siluet */
function person(w: number): Sil { const f = `M${OX} 0a9 9 0 1 1 0.01 0ZM${OX - w / 2} 22h${w}l-4 40h-3l-2 38h-6l-1-30h-2l-1 30h-6l-2-38h-3Z`; return { f, i: '', k: f, w, h: H, ox: OX, oy: OY }; }
function bike(): Sil { const f = `M20 80a14 14 0 1 0 0.01 0ZM80 80a14 14 0 1 0 0.01 0ZM46 0a7 7 0 1 1 0.01 0ZM40 16h12l8 30h-8l-6-18-10 24h28l-4 8H30Z`; return { f, i: '', k: f, w: 100, h: H, ox: OX, oy: OY }; }
function lamp(): Sil { const f = `M48 ${OY}V8h-10v-4h24v4h-10V${OY}Z`; return { f, i: '', k: f, w: 24, h: H, ox: OX, oy: OY }; }

export const SHT: Record<string, Sil> = {
  'veg-017': tree('yumaloq', 78), 'veg-051': tree('keng', 92), 'veg-024': tree('keng', 84), 'veg-023': tree('yumaloq', 66),
  'veg-019': tree('yumaloq', 58), 'veg-048': tree('yumaloq', 52), 'veg-050': tree('keng', 60), 'veg-063': tree('yumaloq', 48),
  'veg-084': tree('kolonna', 26), 'veg-119': tree('kolonna', 22), 'veg-035': tree('konus', 46), 'veg-118': tree('konus', 38), 'veg-047': tree('majnun', 80),
  'fonar-07': lamp(),
  ...Object.fromEntries(['velosipedchi-00', 'velosipedchi-01', 'velosipedchi-03', 'velosipedchi-13'].map(k => [k, bike()])),
  ...Object.fromEntries(['bola-03', 'bola-08', 'bola-09', 'bola-12', 'bola-15', 'bola-20', 'bola-22', 'bola-25', 'bola-29', 'bola-33', 'bola-36', 'bola-40', 'bola-48', 'bola-56', 'sport-00', 'sport-05', 'sport-14', 'sport-17'].map(k => [k, person(26)])),
};
