/* Ochiq ma'lumot manbalari reyestri: litsenziya va atributsiya matni (arxitektura hujjati «Global ochiq ma'lumot», 24.10.2026).
   Har kesh yozuvining manifestida shu yerdagi id saqlanadi — sayt va varaqdagi manba qatori shundan chiqadi.
   odbl: true — ODbL ma'lumot (boyitilgan to'plam eksport qilinsa, u ham ODbL bo'lishi kerak). */
export const SOURCES = {
  osm: {
    name: 'OpenStreetMap', licence: 'ODbL 1.0', url: 'https://www.openstreetmap.org/copyright',
    attribution: '© OpenStreetMap contributors', odbl: true, ttlDays: 30,
  },
  overture: {
    name: 'Overture Maps', licence: 'ODbL 1.0 (buildings, transportation); CDLA-Permissive-2.0 (places)', url: 'https://docs.overturemaps.org/attribution/',
    attribution: '© OpenStreetMap contributors, Overture Maps Foundation', odbl: true, ttlDays: 90,
  },
  era5: {
    name: 'ERA5 (Copernicus Climate Change Service)', licence: 'Copernicus licence (C3S)', url: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-timeseries',
    attribution: 'Contains modified Copernicus Climate Change Service information 2026 (ERA5, Hersbach et al.)', odbl: false, ttlDays: 3650,
  },
  worldcover: {
    name: 'ESA WorldCover 2021', licence: 'CC BY 4.0', url: 'https://esa-worldcover.org/en/data-access',
    attribution: '© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium', odbl: false, ttlDays: 365,
  },
  copdem: {
    name: 'Copernicus DEM GLO-30', licence: 'Copernicus DEM licence', url: 'https://registry.opendata.aws/copernicus-dem/',
    attribution: 'Produced using Copernicus WorldDEM-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA', odbl: false, ttlDays: 365,
  },
  hrsl: {
    name: 'Meta High Resolution Settlement Layer', licence: 'CC BY 4.0', url: 'https://registry.opendata.aws/dataforgood-fb-hrsl/',
    attribution: 'Data for Good at Meta, CIESIN — High Resolution Settlement Layer (CC BY 4.0)', odbl: false, ttlDays: 365,
  },
  tmyx: {
    name: 'TMYx (climate.onebuilding.org)', licence: 'Derived statistics — written permission of the authors (D. Crawley, 27.10.2026): commercial use and other countries allowed', url: 'https://climate.onebuilding.org',
    attribution: 'Lawrie, Linda K, Drury B Crawley. 2026. Development of Global Typical Meteorological Years (TMYx). https://climate.onebuilding.org', odbl: false, ttlDays: 3650,
  },
};
export const sourceInfo = (id) => (SOURCES[id] ? { id, ...SOURCES[id] } : null);
