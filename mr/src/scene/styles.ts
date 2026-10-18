/** 3D sahna uslublari (Master reja va Joyshunos uchun umumiy). Kontekst qismlari nomi boʻyicha ranglar. */
export type SceneStyle = 'albom' | 'rangli' | 'arctic' | 'funksiya' | 'minimal';
export const STYLES: { id: SceneStyle; name: string; note: string }[] = [
  { id: 'albom', name: 'Qogʻoz', note: 'oq binolar, och yoʻllar va daraxtlar, soyalar — taqdimot' },
  { id: 'rangli', name: 'Shahar ranglari', note: 'OSM ranglari, sunʼiy yoʻldosh tasviri bilan' },
  { id: 'arctic', name: 'Gips maket', note: 'oq gil model, yumshoq soyalar' },
  { id: 'funksiya', name: 'Funksional', note: 'har funksiya oʻz rangida' },
  { id: 'minimal', name: 'Chizma', note: 'oq-qora grafika' },
];
/** uslubga qarab atrof ranglari (null — «Rangli»: asl ranglar) */
export const STYLE_PAL: Record<Exclude<SceneStyle, 'rangli'>, { pal: Record<string, number>; lerp: number; line: number | null; bg: number }> = {
  albom: { pal: { relyef: 0xf1efea, yashil: 0xe1e9d6, suv: 0xcfdfe8, ariqlar: 0xcfdfe8, 'yoʻlaklar': 0xf8f7f4, trotuarlar: 0xf8f7f4, 'yoʻllar': 0xdfddd8, chiziqlar: 0xffffff, binolar: 0xfcfbf9, tomlar: 0xefece7, daraxtlar: 0xcbd9bf }, lerp: 0.65, line: null, bg: 0xf6f5f2 },
  funksiya: { pal: { relyef: 0xf1efea, yashil: 0xe1e9d6, suv: 0xcfdfe8, ariqlar: 0xcfdfe8, 'yoʻlaklar': 0xf8f7f4, trotuarlar: 0xf8f7f4, 'yoʻllar': 0xdfddd8, chiziqlar: 0xffffff, binolar: 0xf4f2ee, tomlar: 0xe9e6e0, daraxtlar: 0xcbd9bf }, lerp: 0.65, line: null, bg: 0xf6f5f2 },
  arctic: { pal: { relyef: 0xf7f6f3, yashil: 0xeef0ea, suv: 0xe4ebef, ariqlar: 0xe4ebef, 'yoʻlaklar': 0xfbfaf8, trotuarlar: 0xfbfaf8, 'yoʻllar': 0xecebe7, chiziqlar: 0xffffff, binolar: 0xffffff, tomlar: 0xf6f5f2, daraxtlar: 0xeef1ea }, lerp: 0.88, line: null, bg: 0xfafaf8 },
  minimal: { pal: { relyef: 0xffffff, yashil: 0xf1f1f1, suv: 0xe6e6e6, ariqlar: 0xe6e6e6, 'yoʻlaklar': 0xfafafa, trotuarlar: 0xfafafa, 'yoʻllar': 0xdedede, chiziqlar: 0xffffff, binolar: 0xf7f7f7, tomlar: 0xededed, daraxtlar: 0xd8d8d8 }, lerp: 0.9, line: 0x6a6a6a, bg: 0xffffff },
};
