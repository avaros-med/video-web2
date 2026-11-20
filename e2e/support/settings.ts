/**
 * Where the end-to-end suite finds the local stack and who it signs in as. Read from the
 * environment, then `.env.local`, then `.env`. The OSCAR sign-in and the test patient
 * live only in the untracked `.env.local` (CLAUDE.md, "End-to-end tests").
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..', '..')

/** KEY=value lines of a dotenv file; comments, blank lines and surrounding quotes dropped. */
export const parseEnvFile = (text: string): Record<string, string> => {
    const values: Record<string, string> = {}
    for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
        if (!match) continue
        let value = match[2]
        const quoted = value.match(/^(['"])(.*)\1$/)
        value = quoted ? quoted[2] : value.replace(/\s+#.*$/, '')
        values[match[1]] = value
    }
    return values
}

const readEnvFile = (name: string): Record<string, string> => {
    const file = path.join(ROOT, name)
    return fs.existsSync(file) ? parseEnvFile(fs.readFileSync(file, 'utf8')) : {}
}

const env: Record<string, string | undefined> = {
    ...readEnvFile('.env'),
    ...readEnvFile('.env.local'),
    ...process.env,
}

const trimSlash = (url: string) => url.replace(/\/+$/, '')

export class SettingsError extends Error {}

export const settings = {
    /** The CRA dev server (`npm start`): https on 3003 (.env.example). */
    uiUrl: trimSlash(env.E2E_UI_URL || `${env.HTTPS === 'false' ? 'http' : 'https'}://localhost:${env.PORT || 3003}`),
    /** Where the room page lives on the dev server (`REACT_APP_BASE_HREF`). */
    basePath: env.REACT_APP_BASE_HREF || '/av/video2-mysql',
    /** ehr, as the page reaches it in development (src/services/http/ehr.ts). */
    ehrUrl: trimSlash(env.E2E_EHR_URL || env.REACT_APP_EHR_URL || 'http://localhost:3000'),
    /** The local OSCAR that issues the JWT. */
    oscarUrl: trimSlash(env.E2E_OSCAR_URL || 'http://localhost:8080/oscar'),
    /** The provider the visits are booked with; the signed-in one when unset. */
    providerId: env.E2E_PROVIDER_ID ? Number(env.E2E_PROVIDER_ID) : undefined,
    /** The clinic's zone: the visits are booked in its wall clock. */
    timezone: env.E2E_TIMEZONE || 'America/Toronto',
    /** The signed-in cookies, written by the global setup; gitignored. */
    storageStatePath: path.join(ROOT, 'e2e', '.auth', 'state.json'),
}

export const SETUP_HINT =
    'Create .env.local in the repo root (it is gitignored) with OSCAR_USERNAME, OSCAR_PASSWORD, OSCAR_PIN ' +
    'and E2E_DEMOGRAPHIC_NO; see CLAUDE.md, "End-to-end tests".'

/** The OSCAR sign-in, or an error saying how to provide it. */
export const oscarCredentials = () => {
    const missing = ['OSCAR_USERNAME', 'OSCAR_PASSWORD', 'OSCAR_PIN'].filter(key => !env[key])
    if (missing.length) {
        throw new SettingsError(`Missing ${missing.join(', ')}. ${SETUP_HINT}`)
    }
    return { username: env.OSCAR_USERNAME as string, password: env.OSCAR_PASSWORD as string, pin: env.OSCAR_PIN as string }
}

/** The patient the visits are booked for: a test patient on the dev clinic, only read. */
export const testPatientNumber = (): number => {
    const value = Number(env.E2E_DEMOGRAPHIC_NO)
    if (!Number.isInteger(value) || value <= 0) {
        throw new SettingsError(`Missing or invalid E2E_DEMOGRAPHIC_NO. ${SETUP_HINT}`)
    }
    return value
}

/** A room's page on the dev server. */
export const roomPageUrl = (roomName: string) => `${settings.uiUrl}${settings.basePath}/room/${roomName}`
