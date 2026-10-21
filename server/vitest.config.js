import { defineConfig } from 'vitest/config';
// Haqiqiy PostgreSQL bilan (CI) test fayllari bitta bazani tozalab ishlatadi — parallel emas, ketma-ket
export default defineConfig({ test: { fileParallelism: !process.env.TEST_DATABASE_URL } });
