/**
 * 06.11 (c62, egasi: «bogʻchada boʻsh yer gʻalati turibdi; qoida qanday — bino qancha qismni egallaydi, qavatliligi qanday»):
 * MTM uchastkasi tarkibi. Meʼyor (asl matn): 543-band — uchastka 40 / 35 m² oʻringa; 5-ilova (5-ustun) — bino 33 m² oʻringa;
 * QMQ 2.01.03-19, 3.1-jadval 2-izoh — 8–9 ballda bogʻcha 2 qavat bilan cheklanadi; 39-jadval — qizil chiziqdan 25 m.
 * ShNQ 2.07.01-23, 544-band (01/2-42 tahririda) MTM va hududini ShNQ 2.08.02-23 ga yuboradi (avval 2.08.02-09) — unda MTM guruh
 * maydonchalari va hududi boʻyicha talab yoʻq (c68 tekshiruvi), shuning uchun guruh hajmi, guruh maydonchasi, umumiy sport maydoni, xoʻjalik zonasi va koʻkalamzorlik ulushi — ANDOZA (MDH amaliyoti).
 */
export const MTM = {
  /** ANDOZA: bir guruhda bolalar soni */
  group: 20,
  /** ANDOZA: guruh oʻyin maydonchasi, m² (≈ 7,2 m²/bola) — har guruhga bittadan, soyabon bilan */
  play: 150,
  /** ANDOZA: soyabon (ayvon) — guruh maydonchasida, m */
  canopy: [6, 4] as [number, number],
  /** ANDOZA: umumiy jismoniy tarbiya maydoni, m² (har 150 oʻringa bittadan) */
  sport: 250,
  /** ANDOZA: xoʻjalik zonasi, m² */
  xojalik: 100,
  /** ANDOZA: uchastkani koʻkalamzorlashtirish ulushi */
  green: 0.5,
};
/** 5-ilova (5-ustun): MTM binosining hisobiy maydoni 1 oʻringa, m² */
export const MTM_M2 = 33;
export const mtmGroups = (cap: number): number => Math.max(1, Math.ceil(cap / MTM.group));
