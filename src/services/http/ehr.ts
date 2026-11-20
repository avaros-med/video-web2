/**
 * Where the room page sends its requests: the clinic's own ehr (ehr docs/schedule-video.md
 * V6). A room ehr made is named `{clinic}_{provider}-{uuid}`, so the clinic comes from the
 * room's name, and its ehr is that clinic's subdomain of the page's own domain:
 *
 *   https://app.avaros.ca/av/video2-mysql/room/braamc_999998-…  →  https://braamc.avaros.ca
 *   https://test.avaros.ca/av/video2-mysql/room/braamc_999998-… →  https://braamc.test.avaros.ca
 *   https://localhost:3003/…                                     →  http://localhost:3000
 *
 * REACT_APP_EHR_URL replaces the whole address in a development build (to point a local
 * page at a test clinic's ehr); a production build ignores it.
 *
 * The clinic name is checked to be one host label before it becomes part of a URL: a
 * crafted link must not send what is typed on the page to another host.
 */
export const EHR_LOCAL_URL = 'http://localhost:3000'

/** The page's host → the domain each clinic's ehr is a subdomain of. */
const CLINIC_DOMAINS: Record<string, string> = {
    'test.avaros.ca': 'test.avaros.ca',
    'app.avaros.ca': 'avaros.ca',
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1']

const CLINIC_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

export class EhrUrlError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'EhrUrlError'
    }
}

/** The clinic a room's name is made for (`{clinic}_…`), or null for a name with none. */
export const clinicOfRoom = (
    roomName: string | null | undefined
): string | null => {
    const separator = (roomName ?? '').indexOf('_')
    if (separator <= 0) return null
    const clinic = roomName!.slice(0, separator)
    return CLINIC_LABEL.test(clinic) ? clinic.toLowerCase() : null
}

export interface EhrLocation {
    roomName: string | null | undefined
    /** `window.location.hostname`. */
    hostname: string
    /** REACT_APP_EHR_URL. */
    override?: string
    isProduction: boolean
}

export const resolveEhrUrl = ({
    roomName,
    hostname,
    override,
    isProduction,
}: EhrLocation): string => {
    const clinic = clinicOfRoom(roomName)
    if (!clinic) {
        throw new EhrUrlError('The room name does not name a clinic')
    }
    if (override?.trim() && !isProduction) {
        return override.trim().replace(/\/+$/, '')
    }
    if (LOCAL_HOSTS.includes(hostname)) {
        return EHR_LOCAL_URL
    }
    const domain = CLINIC_DOMAINS[hostname]
    if (!domain) {
        throw new EhrUrlError(
            `The room page does not know which ehr serves ${hostname}`
        )
    }
    return `https://${clinic}.${domain}`
}

/** The room's clinic's ehr, e.g. `https://braamc.test.avaros.ca`. Throws an EhrUrlError. */
export const ehrUrl = (roomName: string | null | undefined): string =>
    resolveEhrUrl({
        roomName,
        hostname: window.location.hostname,
        override: process.env.REACT_APP_EHR_URL,
        isProduction: process.env.NODE_ENV === 'production',
    })

/** A route of the room, e.g. `roomUrl(name, '/token')`. */
export const roomUrl = (roomName: string, path = ''): string =>
    `${ehrUrl(roomName)}/api/v1/video/rooms/${encodeURIComponent(
        roomName
    )}${path}`

/** A route of the provider's side panel, e.g. `panelUrl(name, '/patients')`. */
export const panelUrl = (roomName: string, path = ''): string =>
    `${ehrUrl(roomName)}/api/v1/video${path}`

/**
 * The signed-in provider's JWT, from the cookie OSCAR sets, sent as a bearer token: with
 * it ehr answers the room's patient, marks what is sent as the provider's, and opens the
 * provider's routes. Without it the page is the patient's.
 */
export const ehrToken = (): string | undefined => {
    const cookie = document.cookie
        .split(';')
        .map(part => part.trim())
        .find(part => part.startsWith('JWT='))
    const value = cookie?.slice('JWT='.length).replace(/"/g, '')
    return value ? decodeURIComponent(value) : undefined
}

export const authHeaders = (): Record<string, string> => {
    const token = ehrToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}
