import { defineConfig } from '@playwright/test';
/* E2E: yigʻilgan ilova (../app) vite preview orqali; mahalliy muhitda oʻrnatilgan Chromium ishlatiladi */
const exe = process.env.PW_CHROMIUM;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:4173/', viewport: { width: 1440, height: 900 }, launchOptions: { executablePath: exe || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } },
  webServer: { command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1', url: 'http://127.0.0.1:4173/', reuseExistingServer: false /* boshqa papkadagi eski server bilan adashmaslik uchun: port band boʻlsa — xato */, timeout: 60_000 },
});
