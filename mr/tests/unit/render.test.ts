import { describe, it, expect } from 'vitest';
import { buildPrompt, gemini, openai, openrouter, nearAR, openaiSize, type AirState } from '../../src/render/providers';

const S = (o: Partial<AirState> = {}): AirState => ({ prov: 'gemini', model: {}, key: {}, sty: 'toshkent', extra: '', keep: true, fid: 'qatiy', ...o });
const img = { url: 'data:image/jpeg;base64,QUJD', w: 1600, h: 900 }, ref = { url: 'data:image/jpeg;base64,UkVG', w: 512, h: 512 };
const ok = (j: unknown) => Promise.resolve(new Response(JSON.stringify(j), { status: 200 }));

describe('Render studiyasi · soʻrov', () => {
  it('uslub, sodiqlik va referens rollari soʻrovga tushadi', () => {
    const p = buildPrompt(S({ extra: 'terrakota gʻisht' }), 'reja', ['material', 'yorugik']);
    expect(p).toMatch(/^The first image is the BASE image/);
    expect(p).toContain('Tashkent'); expect(p).toContain('Image 2 is a MATERIAL reference'); expect(p).toContain('Image 3 is a LIGHTING reference');
    expect(p).toContain('Do not add or remove buildings'); expect(p).toContain('terrakota');
    expect(buildPrompt(S({ fid: 'erkin' }), 'bino')).toContain('loose composition guide');
    expect(buildPrompt(S({ sty: '' }), 'eskiz', ['uslub'])).toContain('high-quality architectural visualization');
  });
  it('kadr nisbati', () => { expect(nearAR(1600 / 900)).toBe('16:9'); expect(openaiSize(0.6)).toBe('1024x1536'); });
});

describe('Render studiyasi · provayderlar (koʻp rasm)', () => {
  it('Gemini: asos + referenslar inline_data sifatida, natija rasmi qaytadi', async () => {
    let body: any = null;
    const f = ((_u: string, o: RequestInit) => { body = JSON.parse(String(o.body)); return ok({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'UE5H' } }] } }] }); }) as unknown as typeof fetch;
    expect(await gemini('k', 'm', 'P', img, f, [ref])).toBe('data:image/png;base64,UE5H');
    expect(body.contents[0].parts.filter((p: any) => p.inline_data).map((p: any) => p.inline_data.data)).toEqual(['QUJD', 'UkVG']);
    expect(body.generationConfig.imageConfig.aspectRatio).toBe('16:9');
  });
  it('OpenAI: bir nechta rasm — image[]', async () => {
    let fd: FormData | null = null;
    const f = ((u: string, o?: RequestInit) => { if (u.startsWith('data:')) return Promise.resolve(new Response(new Blob(['x'], { type: 'image/jpeg' }))); fd = o!.body as FormData; return ok({ data: [{ b64_json: 'QQ==' }] }); }) as unknown as typeof fetch;
    expect(await openai('k', 'gpt-image-1', 'P', img, f, [ref])).toBe('data:image/png;base64,QQ==');
    expect(fd!.getAll('image[]').length).toBe(2); expect(fd!.get('size')).toBe('1536x1024');
  });
  it('OpenRouter: rasmlar image_url, xato matni koʻrsatiladi', async () => {
    let body: any = null;
    const f = ((_u: string, o: RequestInit) => { body = JSON.parse(String(o.body)); return ok({ choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,Wg==' } }] } }] }); }) as unknown as typeof fetch;
    expect(await openrouter('k', 'm', 'P', img, f, [ref, ref])).toContain('Wg==');
    expect(body.messages[0].content.filter((c: any) => c.type === 'image_url').length).toBe(3);
    const bad = (() => Promise.resolve(new Response(JSON.stringify({ error: { message: 'kalit notoʻgʻri' } }), { status: 401 }))) as unknown as typeof fetch;
    await expect(gemini('k', 'm', 'P', img, bad)).rejects.toThrow(/401 kalit notoʻgʻri/);
  });
});
