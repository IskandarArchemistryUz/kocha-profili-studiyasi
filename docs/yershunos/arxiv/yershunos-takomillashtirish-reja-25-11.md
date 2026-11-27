# Yershunos — takomillashtirish: yangi hudud tahlillari va kerakli ishlar (25.11.2026)

Asos: `claude/mintaqa-xavf-xizmati-reja-16-11.md` (42 tahlil ro'yxati, §1), 23.11 gacha bajarilgan bosqichlar, xalqaro amaliyot (World Bank/GFDRR City Scan), 25.11 dagi manba tekshiruvi. Holat: taklif, Iskandar tasdiqlamagan.

## 1. Hozir nima bor
Relyef va havza · daryo mobillik koridori · toshqin (Pskem, 2D) · jala (rain-on-grid) · iqlim (CMIP6, 11 ko'rsatkich) · shahar kengayishi × xavf · toshqinda kasalxonagacha vaqt · avtomat skrining zanjiri (Angren, Chorvoq, Farg'ona sinovlari).

## 2. Asosiy bo'shliqlar (xalqaro etalon bilan solishtirish)
GFDRR City Scan qamraydigan xavflar: toshqin, ko'chki, seysmik, havo ifloslanishi, shahar issiqligi, dengiz sathi, qirg'oq eroziyasi, qurg'oqchilik, yong'in (gfdrr.org/en/gfdrr-product/city-scan; O'zbekistonning 4 shahri uchun qilingan). Yershunos'da yo'q: **seysmik, ko'chki, havo/chang, mintaqaviy issiqlik, yong'in**. Bizning ustunlik: hisob (2D toshqin, kelish vaqti, uzilgan qishloqlar), City Scan'da esa faqat tayyor global qatlamlar ustma-ust qo'yiladi.

Ikkinchi bo'shliq — **ta'sir**: xavf bor, lekin «kimga tegadi» zaif. OSM binolari qurilgan maydonning ~40 % ini qamraydi (§13.3), aholi qatlami yo'q.

Uchinchi — **qaror**: natija zonalash va ruxsat/taqiqqa aylanmayapti, Master reja'ga o'tmayapti.

## 3. Yangi tahlillar — taklif (★ = birinchi navbat)

### A. Ta'sir asosi (hamma rejimni kuchaytiradi)
1. ★ **Binolar: Overture Maps** (OSM + Esri + Google Open Buildings + Microsoft ML birlashtirilgan; ODbL). Markaziy Osiyoda qamrov asosan Microsoft ML hisobiga bo'lishi kutiladi — sinovda tekshiriladi. OSM o'rniga standart manba.
2. ★ **Aholi: GHS-POP (100 m)** → xavf zonasidagi aholi, SDG 11.3.1 (yer iste'moli / aholi o'sishi), zichlik dinamikasi.
3. ★ **Ijtimoiy obyektlar qamrovi**: maktab, bog'cha, poliklinika, o't o'chirish — izoxron bo'yicha, oddiy kunda va xavf ssenariysida.
4. Kritik infratuzilma: ko'prik, podstansiya, suv inshooti, to'g'on (GRanD/GOODD) — «yuqorida nima turibdi».

### B. Yangi xavflar
5. ★ **Seysmik**: GEM global xaritasi (PGA, 475 yil) + Markaziy Osiyo uchun yangi mintaqaviy model (Poggi va b., NHESS 2025; SFRARR dasturi, ma'lumot World Bank katalogida). × bino yoshi (WSF Evolution yili) → «eski fond kuchli zonada». Litsenziyalar tekshiriladi (GEM mahsulotlarida CC BY-NC-SA ham uchraydi).
6. ★ **Ko'chki moyilligi**: qiyalik + egrilik + yer qoplami + yog'in + yo'l/daryo kesishi; ko'p mezonli skrining. Tekshirish — ma'lum hodisalar bilan.
7. **Mintaqaviy issiqlik**: Landsat LST (Joyshunos quvuri bor) → shahar/tuman miqyosida issiqlik oroli, yashil maydon tanqisligi, zaif aholi.
8. **Havo va chang**: Sentinel-5P (NO₂), CAMS aerozol; Orolqum changi yo'llari. Urbanistik savol: shamollatish koridorlari va sanoat zonalari joylashuvi.
9. **Qurg'oqchilik va suv tanqisligi**: SPEI bor; qo'shiladi — sug'oriladigan yer × suv manbai, JRC Global Surface Water dinamikasi, GRACE trendi.
10. Sho'rlanish va yer degradatsiyasi (Sentinel-2 indekslari) — Qoraqalpog'iston, Buxoro, Xorazm uchun.
11. Yong'in (FIRMS) — past ustuvorlik; tog' oldi o'rmon va to'qay uchun.

### C. Mavjudlarni chuqurlashtirish
12. ★ **GloFAS sarflari**: daryo toshqinini yarim avtomat qilish. GloFAS v4 reanaliz — 0,05° (~5 km), kunlik sarf; qaytish davri chegaralari yillik maksimumlarga Gumbel taqsimoti bilan (1979–2022). v5 2026-noyabrdan sinov platformasida. HydroRIVERS o'rtachasi Pskemda 2 baravar past chiqqan (§13.4) — GloFAS shuni tuzatadi.
13. ★ **Tekislik rejimi** (§12.3): kanal = to'siq va manba, zovur = kuydiriladi; kanal yorilishi, botiqlar, zovurdan balandlik. O'zbekiston aholisining ko'pi tekislikda — busiz xizmat tog' bilan cheklanadi.
14. Sel reologiyasi (Voellmy), dam-break (to'liq SWE; Sardoba 2020 bilan tekshirish), MODIS qor, muzliklar (RGI + OGGM), mahalliy IDF.
15. Bino manbasi almashgach §13.3 va §13.8 ni qayta hisoblash.

### D. Qaror va chiqish
16. ★ **Ko'p xavfli xulosa (mahalla / tuman / 250 m hex)**: har xavf bo'yicha sinf + aholi → bitta jadval va xarita; «qayerda nima qilish mumkin emas / shart bilan / mumkin».
17. ★ **Hudud pasporti**: Chizmadon varaqlari + PDF (havza, relyef, xavflar, ta'sir, iqlim, manbalar va cheklovlar varag'i). Donor va hokimiyat uchun asosiy mahsulot.
18. **Huquqiy buferlar × haqiqiy xavf** (kvadrant). DIQQAT: VMQ 981-son (11.12.2019, suvni muhofaza qilish zonalari tartibi) lex.uz bo'yicha **23.06.2026 dan kuchini yo'qotgan** (VMQ 317-son, 22.06.2026). Amaldagi tartib va masofalar aniqlanmaguncha bu qatlam kodlanmaydi — Normalar kutubxonasidan aniq band bilan.
19. Master reja'ga uzatish: xavf zonalari → «Mavjud holat va cheklovlar» qatlami.
20. Ssenariylar: trend / kompakt / xavfdan qochuvchi kengayish; NbS katalogi (ta'sir oralig'i + xarajat).

### E. Mahsulot qulayligi
21. ★ Hudud tanlash: to'rtburchakdan tashqari — nuqtadan havza, tuman/viloyat chegarasi, foydalanuvchi GeoJSON'i.
22. Ikki hududni yonma-yon solishtirish; vaqt slayderi hamma qatlamda bir xil.
23. Foydalanuvchi ma'lumoti: topo-syomka/LiDAR, kuzatilgan sarf, ko'prik zazori → «ekspert rejimi».
24. Tillar (en, ru), Sputnik fon, video eksport (tanga).

## 4. Buning uchun nima qilish kerak
- **Server** (hammasidan oldin): zanjirni o'rnatish, navbat (bitta hisob), kesh, tanga narxi maydon bo'yicha. Yuklab olish serverda to'g'ridan-to'g'ri (sandbox cheklovi yo'qoladi).
- **Ma'lumot quvurlari**: Overture (GeoParquet, bbox bo'yicha), GHS-POP, GloFAS (CDS API), GEM/SFRARR, Sentinel-5P.
- **Litsenziya tekshiruvi** (Lab pullik): GEM xaritasi va mintaqaviy modellar, SFRARR ma'lumoti, GloFAS (Copernicus), ETH kanop, World Bank CCKP. Overture binolari — ODbL (atributsiya va hosila baza sharti).
- **Tekshirish to'plami**: har yangi tahlil uchun 3 hudud (tog' — Chorvoq, tekislik — Farg'ona, shahar — Toshkent aglomeratsiyasi) + ma'lum hodisa bilan solishtirish.
- **Halollik qoidasi** saqlanadi: har natijada «skrining / ko'rgazmali» belgisi, farazlar va «hisoblanmadi — sababi».

## 5. Taklif etilgan navbat (bitta ish — bitta PR)
1. Server + navbat + tanga.
2. Overture binolar + GHS-POP → ta'sir hamma rejimda.
3. Seysmik + ko'chki (skrining qatlamlari).
4. GloFAS → daryo toshqini istalgan joyda.
5. Tekislik rejimi.
6. Ko'p xavfli xulosa + hudud pasporti (PDF / Chizmadon).
7. Huquqiy buferlar (norma aniqlangach), Master reja'ga uzatish.
8. Issiqlik, havo/chang, sho'rlanish; ssenariylar va NbS.

## 6. Iskandardan kerak
- Asosiy foydalanuvchi kim: quruvchi (uchastka feasibility), hokimiyat/qo'mita (hududiy reja) yoki donor loyihasi (risk assessment)? Navbat shunga qarab o'zgaradi.
- Tanga narxi: ≤ 500 km² va undan katta.
- VMQ 981 o'rniga amaldagi hujjat (bilsangiz) yoki Normalar kutubxonasida qidirishga ruxsat.
- Mahalliy ma'lumot: Gidromet sarflari, kanal/zovur tarmog'i, kadastr — bor bo'lsa.

Manbalar (25.11 da ko'rilgan): gfdrr.org City Scan; ECMWF GloFAS wiki va JRC katalogi (GloFAS v4); docs.overturemaps.org (binolar, ODbL); globalquakemodel.org (Central Asia Hazard, Global Seismic Hazard Map); Poggi va b., NHESS 25, 817 (2025); lex.uz/docs/4640429 (VMQ 981 holati — sahifaning bir qismi o'qilgan).
