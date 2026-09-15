import { defineConfig } from '@playwright/test'
import path from 'node:path'
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('.playwright')
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort', url: 'http://127.0.0.1:4175', reuseExistingServer: false, env: { VITE_SUPABASE_URL: 'https://careline-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'isolated-browser-test-key' } },
})
