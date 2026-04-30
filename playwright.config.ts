import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local', quiet: true })

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global-setup.ts',
    timeout: 90_000,
    retries: 1,
    fullyParallel: true,
    workers: 4,
    use: {
        baseURL: 'http://localhost:3002',
        screenshot: 'on',
        permissions: ['camera', 'microphone'],
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
