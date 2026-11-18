import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDbip, lookupIn, makeGeoIp } from '../src/geoip.js';
import { geoOf } from '../src/owner.js';

const CSV = [
  '0.0.0.0,0.255.255.255,ZZ',
  '10.0.0.0,10.255.255.255,ZZ',
  '84.54.64.0,84.54.127.255,UZ',
  '195.158.0.0,195.158.31.255,UZ',
  '8.8.8.0,8.8.8.255,US',
  '2a02:2168::,2a02:2168:ffff:ffff:ffff:ffff:ffff:ffff,RU',
  '2001:db8::,2001:db8:ffff:ffff:ffff:ffff:ffff:ffff,ZZ',
].join('\n') + '\n';

describe('geoip (DB-IP Lite)', () => {
  const tab = parseDbip(CSV);
  it('IPv4 va IPv6 oraliqlari', () => {
    expect(lookupIn(tab, '84.54.70.1')).toBe('UZ');
    expect(lookupIn(tab, '195.158.26.90')).toBe('UZ');
    expect(lookupIn(tab, '8.8.8.8')).toBe('US');
    expect(lookupIn(tab, '::ffff:8.8.8.8')).toBe('US');
    expect(lookupIn(tab, '2a02:2168:1:2::5')).toBe('RU');
  });
  it('xususiy, zaxiralangan va notoʻgʻri manzil — null', () => {
    for (const ip of ['10.1.2.3', '127.0.0.1', '2001:db8::1', 'abc', '', null, '84.54.63.255', '1.2.3']) expect(lookupIn(tab, ip)).toBeNull();
  });
  it('geoOf: Cloudflare sarlavhasi ustun, boʻlmasa IP', () => {
    const g = { lookup: (ip) => lookupIn(tab, ip) };
    expect(geoOf({ 'cf-ipcountry': 'KZ' }, '84.54.70.1', g)).toEqual({ country: 'KZ', city: null });
    expect(geoOf({}, '84.54.70.1', g)).toEqual({ country: 'UZ', city: null });
    expect(geoOf({ 'cf-ipcountry': 'XX' }, '8.8.8.8', g)).toEqual({ country: 'US', city: null });
    expect(geoOf({}, '10.0.0.1', g)).toBeNull();
    expect(geoOf({}, '84.54.70.1')).toBeNull();
  });
  it('makeGeoIp: yuklab oladi, faylga yozadi, joriy oy boʻlmasa oldingisi', async () => {
    const big = Array.from({ length: 1200 }, (_, i) => `1.${i >> 8}.${i & 255}.0,1.${i >> 8}.${i & 255}.255,UZ`).join('\n') + '\n' + CSV;
    const urls = [];
    const fetchImpl = async (u) => { urls.push(u); return u.includes('2026-11') ? { ok: false, status: 404 } : { ok: true, arrayBuffer: async () => gzipSync(big) }; };
    const dir = await mkdtemp(join(tmpdir(), 'geoip-'));
    const gi = makeGeoIp({ dir, fetchImpl, now: () => Date.parse('2026-11-18T05:00:00Z'), log: {} });
    expect(gi.lookup('84.54.70.1')).toBeNull();
    await gi.refresh();
    expect(urls).toEqual(['https://download.db-ip.com/free/dbip-country-lite-2026-11.csv.gz', 'https://download.db-ip.com/free/dbip-country-lite-2026-10.csv.gz']);
    expect(gi.lookup('84.54.70.1')).toBe('UZ');
    expect(await readdir(dir)).toEqual(['dbip-country-lite.csv.gz']);
    // yangi fayl — qayta yuklanmaydi; boshqa nusxa fayldan oʻqiydi
    const gi2 = makeGeoIp({ dir, fetchImpl: async () => { throw new Error('chaqirilmasin'); }, now: () => Date.now(), log: {} });
    await gi2.refresh();
    expect(gi2.lookup('8.8.8.8')).toBe('US');
  });
});
