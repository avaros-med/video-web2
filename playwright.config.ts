/**
 * End-to-end suite: the real room page, ehr, OSCAR and the dev clinic database; only the
 * Twilio Video SDK and the camera and microphone are mocked (e2e/fixtures.ts). Run with
 * `npm run test:e2e`; setup in CLAUDE.md, "End-to-end tests".
 */
import { defineConfig, devices } from '@playwright/test'

import { settings } from './e2e/support/settings'

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.spec.ts',
    outputDir: './test-results',
    globalSetup: require.resolve('./e2e/support/globalSetup'),
    // One clinic and its event streams are shared by every test
    workers: 1,
    fullyParallel: false,
    retries: 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: [['list']],
    use: {
        ...devices['Desktop Chrome'],
        baseURL: settings.uiUrl,
        // The dev server's own https certificate
        ignoreHTTPSErrors: true,
        permissions: ['camera', 'microphone'],
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium' }],
})
