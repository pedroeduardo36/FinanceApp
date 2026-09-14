import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { channel: process.platform === 'darwin' ? 'chrome' : undefined, baseURL: 'http://127.0.0.1:4173/FinanceApp/',
    launchOptions: process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {},
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/FinanceApp/', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://finance-tests.invalid', VITE_SUPABASE_ANON_KEY: 'sb_publishable_test' },
  },
});
