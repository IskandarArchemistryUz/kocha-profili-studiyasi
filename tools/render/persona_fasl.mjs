// Archemistry Lab — personaj varaqlarining fasl variantlari (fal, GPT Image 2 edit)
// Asl varaq (<id>.png) = bahor/kuz. Bu skript <id>_yoz.png va <id>_qish.png yasaydi.
// Ishga tushirish:  FAL_KEY=... node persona_fasl.mjs [papka] [id ...]
// Model: openai/gpt-image-2/edit, kirish: image_urls (massiv). Rasm data URI sifatida yuboriladi.

import fs from "node:fs/promises";
import path from "node:path";

const MODEL = "openai/gpt-image-2/edit";
const KEY = process.env.FAL_KEY;
if (!KEY) { console.error("FAL_KEY yo'q"); process.exit(1); }

const KEEP =
  "Edit this character reference sheet. Keep EXACTLY the same person in all four views: same face, age, hair, " +
  "body proportions, height, pose and camera framing, same light grey studio background, same four-view layout " +
  "(front, side, back, three-quarter walking). Change ONLY the clothing and seasonal accessories. " +
  "Keep the person's cultural style and modesty: if they wear a headscarf, a long skirt, a doppi or a chapan, " +
  "keep a seasonal version of it. Keep any props they carry (bag, backpack, bicycle, coffee, market bag) unless noted. " +
  "Realistic, contemporary Tashkent, Uzbekistan. No text, no logos. Season: ";

const SEASONS = {
  yoz:
    "hot Tashkent summer, around 38-40 °C: light breathable cotton and linen in light colours, short sleeves or thin long sleeves, " +
    "sandals or light sneakers, sunglasses or a sun hat where natural; elders keep traditional light summer clothing " +
    "(thin cotton yaktak robe for the old man, light cotton dress and thin headscarf for the old woman).",
  qish:
    "cold Tashkent winter, around 0 °C with light snow: warm puffer jacket or wool coat, knitted hat or warm headscarf, " +
    "scarf, gloves, warm boots; children in colourful winter jackets and hats; the old man in a quilted chapan (to'n) " +
    "over warm clothes with a warm hat; a few snowflakes on shoulders is fine, background stays plain grey.",
};

// Tarmoq uzilsa (fetch failed) — 5 martagacha qayta urinish, 5/10/20/40/60 s kutib
async function retry(fn, label) {
  const waits = [5, 10, 20, 40, 60];
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      const net = /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket/i.test(String(e?.message) + String(e?.cause?.code ?? ""));
      if (!net || i >= waits.length) throw e;
      console.log(`  tarmoq uzildi (${label}), ${waits[i]} s dan keyin qayta...`);
      await new Promise(r => setTimeout(r, waits[i] * 1000));
    }
  }
}

// Qo'shimcha rang ko'rsatmalari (guruh sahnasida odamlar bir-biriga o'xshamasin)
const EXTRA = {
  erkak_yoz: " Clothing colours: light blue short-sleeve linen shirt, navy chino shorts or light grey trousers, white sneakers.",
  ota_yoz: " Clothing colours: olive green polo shirt, dark beige chinos, brown sandals.",
  "talaba-yigit_yoz": " Clothing colours: terracotta orange t-shirt, black shorts or dark jeans, colourful sneakers; keep the backpack.",
  ofis_yoz: " Clothing colours: sage green light blazer or blouse, navy wide trousers, light flats; keep laptop bag and coffee.",
};

async function run(id, fasl, dir) {
  const src = path.join(dir, `${id}.png`);
  const b64 = (await fs.readFile(src)).toString("base64");
  const body = { prompt: KEEP + SEASONS[fasl] + (EXTRA[`${id}_${fasl}`] ?? ""), image_urls: [`data:image/png;base64,${b64}`], quality: "high", num_images: 1 };
  const sub = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: "POST", headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!sub.ok) throw new Error(`${id}_${fasl}: submit ${sub.status} ${await sub.text()}`);
  const { status_url, response_url } = await sub.json();
  for (;;) {
    await new Promise(r => setTimeout(r, 4000));
    const s = await (await fetch(status_url, { headers: { Authorization: `Key ${KEY}` } })).json();
    if (s.status === "COMPLETED") break;
    if (s.status === "FAILED" || s.status === "ERROR") throw new Error(`${id}_${fasl}: ${JSON.stringify(s)}`);
  }
  const res = await (await fetch(response_url, { headers: { Authorization: `Key ${KEY}` } })).json();
  const url = res.images?.[0]?.url;
  if (!url) throw new Error(`${id}_${fasl}: rasm yo'q ${JSON.stringify(res).slice(0, 300)}`);
  const out = path.join(dir, `${id}_${fasl}.png`);
  await fs.writeFile(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  return out;
}

const [dir = ".", ...only] = process.argv.slice(2);
const all = (await fs.readdir(dir)).filter(f => /^[a-z-]+\.png$/.test(f)).map(f => f.replace(".png", ""));
const ids = only.length ? all.filter(i => only.includes(i)) : all;
for (const id of ids) for (const fasl of Object.keys(SEASONS)) {
  try { await fs.access(path.join(dir, `${id}_${fasl}.png`)); console.log("BOR", id, fasl); continue; } catch {}
  try { console.log("OK ", await retry(() => run(id, fasl, dir), `${id}_${fasl}`)); } catch (e) { console.error("XATO", e.message); }
}
