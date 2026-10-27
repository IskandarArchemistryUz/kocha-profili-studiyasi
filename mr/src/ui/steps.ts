/** 11 qadam (27.10: «Hudud» va «Uchastka» birlashdi) — ish tartibining yagona taʼrifi (nomi, belgisi, qaysi bosqichda quriladi). Belgilar — dizayn «Ikonkalar»: 24 × 24, chiziq 1,75 */
export interface StepDef { id: string; n: number; title: string; lead: string; icon: string; phase: number }

export const STEPS: StepDef[] = [
  { id: 'uchastka', n: 1, title: 'Joy va uchastka', lead: 'Joyni toping va atrofni yuklang, keyin loyiha chegarasini belgilang — kvartalni bosing, chizing yoki oʻlcham kiriting. Chegara chizilgach — unga tutash yoʻllar.', phase: 0, icon: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM9.5 9.5a2.5 2.5 0 1 0 5.0 0a2.5 2.5 0 1 0 -5.0 0"/>' },
  { id: 'kocha', n: 2, title: 'Koʻchalar', lead: 'Koʻcha oʻqini chizing va profilini tanlang — qizil chiziqlar, trotuar, qatorlar va daraxtlar oʻzi chiqadi.', phase: 2, icon: '<path d="M5 21L9 3M19 21L15 3M12 5v2M12 11v2M12 17v2"/>' },
  { id: 'parsel', n: 3, title: 'Parsellar va zonalar', lead: 'Koʻchalar uchastkani kvartallarga boʻladi. Har kvartalga funksiya bering; mavjud binolardan qaysi biri saqlanishini belgilang.', phase: 2, icon: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>' },
  { id: 'yashil', n: 4, title: 'Yashil karkas', lead: 'Yashillik balansi (ShNQ 2.07.01-23, 86-band ≥ 25 %, 36-jadval), hovlilarni obodonlashtirish va maydonchalar (4-jadval), yashil kvartallar.', phase: 2, icon: '<path d="M12 21v-6M12 15c-4 0-6-3-6-6a6 6 0 0 1 12 0c0 3-2 6-6 6z"/>' },
  { id: 'hajm', n: 5, title: 'Hajmlar', lead: 'Kvartalni tanlang va seksiyalarni generatsiya qiling: burchak seksiyalari, zinapoyasimon qavatlar, hovli va oraliqlar ShNQ boʻyicha cheklanadi.', phase: 0, icon: '<path d="M5 21V8l7-4 7 4v13M10 21v-5h4v5M3 21h18"/>' },
  { id: 'quyosh', n: 6, title: 'Quyosh va shamol', lead: 'Soyalar jonli, insolyatsiya xaritasi (SanQvaN 0331-16), shamol guli (EPW) va piyoda sathidagi shamol oqimi.', phase: 3, icon: '<path d="M8.5 12a3.5 3.5 0 1 0 7.0 0a3.5 3.5 0 1 0 -7.0 0M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>' },
  { id: 'fasad', n: 7, title: 'Fasad va tom', lead: 'Material, derazalar, balkonlar va tom — tanlangan binoga, funksiya boʻyicha yoki hammasiga. Tekshiruv — oxirida (SanQvaN 0331-16).', phase: 4, icon: '<path d="M5 3h14v18H5zM8.5 7h2M13.5 7h2M8.5 11h2M13.5 11h2M8.5 15h2M13.5 15h2"/>' },
  { id: 'kvartira', n: 8, title: 'Kvartiralar', lead: 'Kvartira miksi, seksiyalarni kvartiralarga boʻlish va har xona derazasi insolyatsiyasi — SanQvaN 8.3–8.5 va 9.2 boʻyicha.', phase: 4, icon: '<path d="M4 4h16v16H4zM4 11h8V4M12 15h8M16 15v5"/>' },
  { id: 'xizmat', n: 9, title: 'Xizmatlar va piyoda', lead: 'Bogʻcha, maktab, poliklinika, dorixona, doʻkon, sport va jamoat transporti bekatlari: piyoda yoʻllari boʻylab masofa ShNQ 2.07.01-23 radiuslariga (38-jadval; bekat — 382-band) solishtiriladi.', phase: 5, icon: '<path d="M11.5 4.5a1.5 1.5 0 1 0 3.0 0a1.5 1.5 0 1 0 -3.0 0M10 21l2.2-6.2 2.8 2.7V21M8.5 11.5L12 8.5l2.8 2 2.7 1M12 8.5l-1.8 6.3"/>' },
  { id: 'tekshiruv', n: 10, title: 'Meʼyoriy tekshiruv', lead: 'Barcha meʼyorlar bitta jadvalda: band, qiymat, chegara, natija.', phase: 0, icon: '<path d="M4 4h16v16H4zM8 12l3 3 5-6"/>' },
  { id: 'eksport', n: 11, title: 'Taqdimot va eksport', lead: 'Loyiha fayli, rasm, DXF (reja va hajmlar) va GLB (3D model).', phase: 0, icon: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>' },
];

/** Hozirgi qurilgan bosqich — undan kattasi «tez orada» deb koʻrsatiladi */
export const BUILT_PHASE = 5;
