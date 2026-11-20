/**
 * ehr's routes for test data, as the signed-in provider: a Video visit to join (booked
 * through the schedule, so ehr makes its room), its PIN, its removal, and the visit logs.
 * Everything a test books is removed again (given the Deleted status) by `cleanup`.
 */
import { APIRequest, APIRequestContext, APIResponse } from '@playwright/test'
import fs from 'fs'

import { settings, testPatientNumber } from './settings'

export interface VideoVisit {
    appointmentId: number
    roomName: string
    roomUrl: string | null
}

export interface VisitLogRow {
    providerID: number
    physicianFlag: string
    eventDetails: string | null
    clinicalUserInformation: string
    [field: string]: unknown
}

/** The JWT cookie the global setup saved, without its quotes. */
export const savedToken = (): string => {
    let state: { cookies?: { name: string; value: string }[] }
    try {
        state = JSON.parse(fs.readFileSync(settings.storageStatePath, 'utf8'))
    } catch {
        throw new Error(`No signed-in state at ${settings.storageStatePath}: run the suite with npm run test:e2e`)
    }
    const jwt = state.cookies?.find(cookie => cookie.name === 'JWT')
    if (!jwt) throw new Error(`No JWT cookie in ${settings.storageStatePath}`)
    return jwt.value.replace(/"/g, '')
}

/** The claims of the saved token, read without verifying it (ehr does that). */
export const tokenClaims = (token: string = savedToken()): Record<string, unknown> => {
    const payload = token.split('.')[1] ?? ''
    return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
}

const failure = async (response: APIResponse, what: string) => {
    let detail = ''
    try {
        const body = await response.json()
        detail = body?.Message ?? body?.error ?? ''
    } catch {
        // not JSON
    }
    return new Error(`${what}: ehr answered ${response.status()}${detail ? ` — ${detail}` : ''}`)
}

/** "2026-11-19T14:30:00": the clinic's wall clock, `minutes` from now, on a 5-minute mark. */
export const wallClockFromNow = (minutes: number): string => {
    const at = new Date(Math.ceil((Date.now() + minutes * 60_000) / 300_000) * 300_000)
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: settings.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(at)
    const part = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:00`
}

export class Ehr {
    private readonly appointmentIds = new Set<number>()

    private constructor(private readonly api: APIRequestContext) {}

    static async open(request: APIRequest, token: string = savedToken()): Promise<Ehr> {
        const api = await request.newContext({
            baseURL: `${settings.ehrUrl}/api/v1/`,
            extraHTTPHeaders: { Authorization: `Bearer ${token}` },
        })
        return new Ehr(api)
    }

    get providerId(): number {
        return settings.providerId ?? Number(tokenClaims().providerNo)
    }

    /** A Video visit with the test patient, starting `minutes` from now, 15 minutes long. */
    async bookVideoVisit(minutes = 30): Promise<VideoVisit> {
        const startAt = wallClockFromNow(minutes)
        const endAt = startAt.replace(/T(\d\d):(\d\d)/, (_, h, m) => {
            const total = Number(h) * 60 + Number(m) + 14
            return `T${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
        })
        const response = await this.api.post('schedule/appointment', {
            data: {
                providerID: this.providerId,
                demographicID: testPatientNumber(),
                typeID: 0,
                startAt,
                endAt,
                reason: '',
                modality: 'Video',
            },
        })
        if (!response.ok()) throw await failure(response, 'POST /schedule/appointment')
        const { appointment } = await response.json()
        this.appointmentIds.add(appointment.id)
        if (!appointment.roomName) throw new Error('ehr booked the Video visit without a room')
        return { appointmentId: appointment.id, roomName: appointment.roomName, roomUrl: appointment.roomUrl }
    }

    /** Locks the visit's room; answers the new PIN. */
    async lock(visit: VideoVisit): Promise<string> {
        const response = await this.api.post(`schedule/appointments/${visit.appointmentId}/video-lock`)
        if (!response.ok()) throw await failure(response, 'POST /video-lock')
        return (await response.json()).appointment.roomPin
    }

    /** The visit log rows of today, newest first. */
    async visitLogs(): Promise<VisitLogRow[]> {
        const from = new Date(Date.now() - 24 * 3_600_000).toISOString()
        const to = new Date(Date.now() + 24 * 3_600_000).toISOString()
        const response = await this.api.get('schedule/video-visits', {
            params: { from, to, providerID: String(this.providerId) },
        })
        if (!response.ok()) throw await failure(response, 'GET /schedule/video-visits')
        return (await response.json()).visits
    }

    /** Gives every visit this test booked the Deleted status. */
    async cleanup(): Promise<void> {
        for (const id of this.appointmentIds) {
            const response = await this.api.post('schedule/status/appointment', { data: { appointmentID: id, status: 'D' } })
            if (!response.ok()) console.warn(String(await failure(response, `removing appointment ${id}`)))
        }
        this.appointmentIds.clear()
        await this.api.dispose()
    }
}
