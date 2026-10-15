/** 12 qadam — ish tartibining yagona taʼrifi (nomi, belgisi, qaysi bosqichda quriladi) */
export interface StepDef { id: string; n: number; title: string; lead: string; icon: string; phase: number }

export const STEPS: StepDef[] = [
  { id: 'hudud', n: 1, title: 'Hudud', lead: 'Joyni toping va atrofdagi shaharni yuklang: OSM binolari, yoʻllar, suv, yashil hududlar, relyef va sunʼiy yoʻldosh tasviri.', phase: 0, icon: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>' },
  { id: 'uchastka', n: 2, title: 'Uchastka', lead: 'Loyihalanadigan yer chegarasi: yoʻllar orasidagi kvartalni bosib aniqlang, nuqtalab chizing yoki oʻlchamini kiriting.', phase: 0, icon: '<path d="M4 7 9 4l11 4-2 11-12 1z"/>' },
  { id: 'kocha', n: 3, title: 'Koʻchalar', lead: 'Koʻcha oʻqini chizing va profilini tanlang — qizil chiziqlar, trotuar, qatorlar va daraxtlar oʻzi chiqadi.', phase: 2, icon: '<path d="M7 21 10 3M17 21 14 3M12 6v2M12 11v2M12 16v2"/>' },
  { id: 'parsel', n: 4, title: 'Parsellar va zonalar', lead: 'Koʻchalar uchastkani kvartallarga boʻladi. Har kvartalga funksiya bering; mavjud binolardan qaysi biri saqlanishini belgilang.', phase: 2, icon: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>' },
  { id: 'yashil', n: 5, title: 'Yashil karkas', lead: 'Yashil kvartallar (park, skver, bulvar) va ularning aholiga nisbati.', phase: 2, icon: '<path d="M12 21v-6"/><path d="M12 15c-4 0-6-3-6-6 3 0 5 1 6 3 1-2 3-3 6-3 0 3-2 6-6 6z"/>' },
  { id: 'hajm', n: 6, title: 'Hajmlar', lead: 'Binolar va qavatlar. Hozircha qoʻlda; ShNQ generatori 3-bosqichda.', phase: 0, icon: '<path d="M4 20V9l6-4 6 4v11"/><path d="M16 20v-7l4-2v9M2 20h20"/>' },
  { id: 'quyosh', n: 7, title: 'Quyosh va shamol', lead: 'Insolyatsiya, soya xaritasi, shamol oqimi.', phase: 3, icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  { id: 'fasad', n: 8, title: 'Fasad va tom', lead: 'Uslub, derazalar, balkonlar, tom.', phase: 4, icon: '<rect x="5" y="3" width="14" height="18"/><path d="M8 7h3M13 7h3M8 11h3M13 11h3M8 15h3M13 15h3"/>' },
  { id: 'kvartira', n: 9, title: 'Kvartiralar', lead: 'Kvartira miksi va ularning quyoshi.', phase: 4, icon: '<rect x="3" y="5" width="18" height="14"/><path d="M10 5v14M3 12h7M14 9h4M14 13h4"/>' },
  { id: 'xizmat', n: 10, title: 'Xizmatlar va piyoda', lead: 'Maktab, MTM, bekatlar, piyoda oqimi.', phase: 5, icon: '<circle cx="12" cy="5" r="2"/><path d="M10 22l2-8 3 3v5M9 11l3-3 3 2 2 3"/>' },
  { id: 'tekshiruv', n: 11, title: 'Meʼyoriy tekshiruv', lead: 'Barcha meʼyorlar bitta jadvalda: band, qiymat, chegara, natija.', phase: 0, icon: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>' },
  { id: 'eksport', n: 12, title: 'Taqdimot va eksport', lead: 'Loyiha fayli va rasm. PDF, DXF, GLB — 5-bosqichda.', phase: 0, icon: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>' },
];

/** Hozirgi qurilgan bosqich — undan kattasi «tez orada» deb koʻrsatiladi */
export const BUILT_PHASE = 2;
