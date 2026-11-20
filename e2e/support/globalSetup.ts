/**
 * Runs once before the suite: checks the local stack is up, signs in through OSCAR with
 * the credentials in `.env.local`, saves the cookies the provider's pages start with (the
 * JWT is what makes a page the provider's), and checks ehr accepts the token. Anything
 * wrong stops the run here with one message, rather than failing every test.
 */
import { Browser, chromium, request } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { Ehr } from './ehr'
import { oscarCredentials, settings, testPatientNumber } from './settings'

/** Cookies the provider's page needs, copied to path `/` (OSCAR scopes them to /oscar). */
const SESSION_COOKIES = ['JWT', 'JSESSIONID']
const SIGN_IN_TIMEOUT_MS = 20_000

const reachable = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5_000) })
        return response.status < 500
    } catch {
        return false
    }
}

const preflight = async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // the dev server's own certificate
    const checks: [string, string][] = [
        [`${settings.uiUrl}${settings.basePath}/`, `the room page's dev server at ${settings.uiUrl} — start it with \`npm start\``],
        [`${settings.ehrUrl}/up`, `ehr at ${settings.ehrUrl} — start it with \`bin/dev\` in the ehr repo`],
        [`${settings.oscarUrl}/index.jsp`, `OSCAR at ${settings.oscarUrl}`],
    ]
    const down: string[] = []
    for (const [url, description] of checks) {
        if (!(await reachable(url))) down.push(`  - ${description}`)
    }
    if (down.length) {
        throw new Error(`The end-to-end suite needs the local stack running. Not answering:\n${down.join('\n')}`)
    }
}

const signIn = async (browser: Browser) => {
    const { username, password, pin } = oscarCredentials()
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`${settings.oscarUrl}/index.jsp`)
    await page.getByPlaceholder('Username@clinic').fill(username)
    await page.getByPlaceholder('Password', { exact: true }).fill(password)
    await page.getByPlaceholder('PIN', { exact: true }).fill(pin)
    await page.getByRole('button', { name: 'LOGIN' }).click()

    const deadline = Date.now() + SIGN_IN_TIMEOUT_MS
    for (;;) {
        if (/[?&]login=/.test(page.url())) {
            throw new Error('OSCAR refused the OSCAR_USERNAME, OSCAR_PASSWORD and OSCAR_PIN in .env.local')
        }
        if ((await context.cookies()).some(cookie => cookie.name === 'JWT')) break
        if (Date.now() > deadline) {
            throw new Error(`Signed in to OSCAR, but it set no JWT cookie within ${SIGN_IN_TIMEOUT_MS / 1000} s`)
        }
        await page.waitForTimeout(250)
    }

    const host = new URL(settings.uiUrl).hostname
    const cookies = await context.cookies()
    await context.addCookies(
        SESSION_COOKIES.flatMap(name => {
            const cookie = cookies.find(c => c.name === name)
            if (!cookie) return []
            return [{ name, value: cookie.value, domain: host, path: '/', expires: cookie.expires, httpOnly: false, secure: false, sameSite: 'Lax' as const }]
        })
    )

    fs.mkdirSync(path.dirname(settings.storageStatePath), { recursive: true })
    await context.storageState({ path: settings.storageStatePath })
    await context.close()
}

export default async function globalSetup() {
    testPatientNumber() // fails early when it is not set
    await preflight()
    const browser = await chromium.launch()
    try {
        await signIn(browser)
    } finally {
        await browser.close()
    }

    // ehr verifies the token's signature and that its clinic is ehr's CLIENT_NAME
    const ehr = await Ehr.open(request)
    try {
        await ehr.visitLogs()
    } catch (error) {
        const message = (error as Error).message
        throw new Error(
            message.includes(' 401')
                ? `${message} — ehr refused the token OSCAR issued: check ehr's CLIENT_NAME is the clinic you signed in to`
                : message
        )
    } finally {
        await ehr.cleanup()
    }
}
