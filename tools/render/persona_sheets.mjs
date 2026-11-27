// Archemistry Lab — tizim personajlari varaqlarini yasash (fal, GPT Image 2)
// Ishga tushirish:  FAL_KEY=... node persona_sheets.mjs [chiqish_papkasi] [id ...]
//   masalan:  node persona_sheets.mjs ./out            -> hammasi
//             node persona_sheets.mjs ./out erkak ayol -> faqat shu ikkitasi
// Node 18+ (fetch ichida bor). Kalit .env dan olinadi, kodga yozilmaydi.
// MODEL id va parametr nomlari TEKSHIRILSIN: https://fal.ai/models/openai/gpt-image-2/llms.txt

import fs from "node:fs/promises";
import path from "node:path";

const MODEL = "openai/gpt-image-2"; // text-to-image; edit varianti: openai/gpt-image-2/edit
const KEY = process.env.FAL_KEY;
if (!KEY) { console.error("FAL_KEY yo'q"); process.exit(1); }

const BASE =
  "Character reference sheet for architectural visualization staffage. " +
  "Photorealistic photo. The SAME single person shown four times side by side, full body from head to toe, " +
  "evenly spaced: front view, left side view, back view, three-quarter view mid-stride walking. " +
  "Identical face, hair, clothing and proportions in all four views. " +
  "Plain light grey seamless studio background, soft even daylight, no props unless described, " +
  "no text, no labels, no logos, no brand marks. Natural realistic body proportions. " +
  "Contemporary everyday clothing as seen on streets of Tashkent, Uzbekistan, 2026. Person: ";

export const PERSONAS = [
  // Yakka odamlar
  { id: "erkak",      nom: "Erkak (yakka)",       p: "Uzbek man, about 32, short dark hair, light stubble, navy chinos, white shirt with rolled sleeves, light grey jacket over arm, brown leather shoes." },
  { id: "ayol",       nom: "Ayol (yakka)",        p: "Uzbek woman, about 30, dark hair in a low ponytail, beige trench coat, light blue jeans, white sneakers, small crossbody bag." },
  // Bolalar
  { id: "bola-ogil",  nom: "O'g'il bola",         p: "Uzbek boy, about 7 years old, short hair, red hoodie, dark trousers, sneakers, small school backpack. Child proportions, height about 1.2 m." },
  { id: "bola-qiz",   nom: "Qiz bola",            p: "Uzbek girl, about 5 years old, two braids, yellow dress over white long-sleeve top, white tights, pink shoes. Child proportions, height about 1.1 m." },
  // Oila (bolalari — yuqoridagi ikki bola)
  { id: "ota",        nom: "Ota (oila)",          p: "Uzbek father, about 38, short dark hair, neat beard, dark green quilted jacket, grey trousers, dark sneakers." },
  { id: "ona",        nom: "Ona (oila)",          p: "Uzbek mother, about 35, dark hair under a loose light headscarf, long camel coat, long dark skirt, flat shoes, handbag." },
  // Talabalar
  { id: "talaba-qiz", nom: "Talaba qiz",          p: "Uzbek female university student, about 20, long dark hair, oversized cream sweater, wide-leg jeans, white sneakers, tote bag with a rolled drawing tube." },
  { id: "talaba-yigit", nom: "Talaba yigit",      p: "Uzbek male university student, about 21, curly dark hair, black puffer vest over grey hoodie, cargo trousers, sneakers, backpack." },
  // Keksalar (keksa juftlik = otaxon + kampir)
  { id: "otaxon",     nom: "Otaxon (milliy kiyim)", p: "Elderly Uzbek man, about 70, white beard, black and white embroidered doppi skullcap, traditional dark striped chapan robe tied with a belt sash, dark trousers, leather shoes." },
  { id: "kampir",     nom: "Keksa ayol",          p: "Elderly Uzbek woman, about 68, colourful atlas-pattern headscarf, long dark dress, knitted cardigan, comfortable flat shoes." },
  // Faoliyat
  { id: "velosipedchi", nom: "Velosipedchi",      p: "Uzbek man, about 28, riding a city bicycle, helmet, light windbreaker, slim trousers; show the bicycle in all four views (front, side, back, three-quarter riding)." },
  { id: "ofis",       nom: "Ofis xodimi",         p: "Uzbek woman, about 34, short bob haircut, dark grey suit, white blouse, low heels, laptop bag, holding a takeaway coffee cup." },
  { id: "bozor",      nom: "Bozorga ketayotgan ayol", p: "Uzbek woman, about 50, floral headscarf, long warm coat, carrying a woven market bag with greens and a round non bread." },
];

async function run(persona, outDir) {
  const body = { prompt: BASE + persona.p, image_size: { width: 2048, height: 1024 }, quality: "high", num_images: 1 }; // param nomlari TEKSHIRILSIN
  const sub = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: "POST", headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!sub.ok) throw new Error(`${persona.id}: submit ${sub.status} ${await sub.text()}`);
  const { status_url, response_url } = await sub.json();
  for (;;) {
    await new Promise(r => setTimeout(r, 4000));
    const s = await (await fetch(status_url, { headers: { Authorization: `Key ${KEY}` } })).json();
    if (s.status === "COMPLETED") break;
    if (s.status === "FAILED" || s.status === "ERROR") throw new Error(`${persona.id}: ${JSON.stringify(s)}`);
  }
  const res = await (await fetch(response_url, { headers: { Authorization: `Key ${KEY}` } })).json();
  const url = res.images?.[0]?.url ?? res.image?.url;
  if (!url) throw new Error(`${persona.id}: rasm yo'q ${JSON.stringify(res).slice(0, 300)}`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const file = path.join(outDir, `${persona.id}.png`);
  await fs.writeFile(file, buf);
  return file;
}

const [outDir = "./personajlar", ...only] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const list = only.length ? PERSONAS.filter(p => only.includes(p.id)) : PERSONAS;
await fs.writeFile(path.join(outDir, "personas.json"), JSON.stringify(list.map(({ id, nom, p }) => ({ id, nom, tavsif: p })), null, 2));
for (const p of list) {
  try { console.log("OK ", await run(p, outDir)); }
  catch (e) { console.error("XATO", e.message); }
}
