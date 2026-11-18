/** 18.11 (T3): kam quvvatli qurilma — telefon / planshet (sensorli, kichik ekran) yoki ≤ 4 GB xotira (navigator.deviceMemory, Chromium).
 *  Sahnalarda piksel zichligi, soya xaritasi va yashirin xarita kanvasi shu boʻyicha kichraytiriladi */
export const LOW_END: boolean = (() => {
  try {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    return coarse || (mem != null && mem <= 4);
  } catch { return false; }
})();
