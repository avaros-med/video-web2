import {
    hasConnectedRemote,
    decideFallback,
    forgetRelay,
    isRelayRemembered,
    isTokenUsable,
    OutboundStallDetector,
    rememberRelay,
    tokenExpiresAt,
    TOKEN_MARGIN_MS,
} from './relayPolicy'
import { FORCE_RELAY_KEY } from '../../constants'

describe('relay memory', () => {
    beforeEach(() => window.localStorage.clear())

    it('is off until a fallback happened, then on, then off again when forgotten', () => {
        expect(isRelayRemembered()).toBe(false)
        rememberRelay()
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBe('true')
        expect(isRelayRemembered()).toBe(true)
        forgetRelay()
        expect(isRelayRemembered()).toBe(false)
    })
})

describe('OutboundStallDetector', () => {
    it('reports a kind whose byte counter stops moving for the configured polls', () => {
        const detector = new OutboundStallDetector(3)
        expect(detector.observe([{ kind: 'audio', bytesSent: 0 }])).toEqual([]) // baseline
        expect(detector.observe([{ kind: 'audio', bytesSent: 0 }])).toEqual([])
        expect(detector.observe([{ kind: 'audio', bytesSent: 0 }])).toEqual([])
        expect(detector.observe([{ kind: 'audio', bytesSent: 0 }])).toEqual([
            'audio',
        ])
    })

    it('resets the count as soon as bytes move, and tracks kinds independently', () => {
        const detector = new OutboundStallDetector(2)
        detector.observe([
            { kind: 'audio', bytesSent: 100 },
            { kind: 'video', bytesSent: 100 },
        ])
        detector.observe([
            { kind: 'audio', bytesSent: 100 },
            { kind: 'video', bytesSent: 500 },
        ])
        expect(
            detector.observe([
                { kind: 'audio', bytesSent: 100 },
                { kind: 'video', bytesSent: 900 },
            ])
        ).toEqual(['audio'])
        expect(
            detector.observe([
                { kind: 'audio', bytesSent: 160 },
                { kind: 'video', bytesSent: 900 },
            ])
        ).toEqual([])
    })

    it('forgets a kind that disappears from a poll so a re-enabled track starts fresh', () => {
        const detector = new OutboundStallDetector(2)
        detector.observe([{ kind: 'video', bytesSent: 10 }])
        detector.observe([{ kind: 'video', bytesSent: 10 }])
        detector.observe([]) // muted / unpublished
        detector.observe([{ kind: 'video', bytesSent: 10 }]) // baseline again
        expect(detector.observe([{ kind: 'video', bytesSent: 10 }])).toEqual([])
    })
})

describe('decideFallback', () => {
    it('moves to relay once, gives relay up when the relayed call also fails, and never repeats', () => {
        expect(decideFallback(false, false)).toBe('move-to-relay')
        expect(decideFallback(true, false)).toBe('give-up-relay')
        expect(decideFallback(false, true)).toBe('none')
        expect(decideFallback(true, true)).toBe('none')
    })
})

describe('OutboundStallDetector.reset', () => {
    it('forgets its baselines so the next sample starts the count over', () => {
        const detector = new OutboundStallDetector(2)
        detector.observe([{ kind: 'audio', bytesSent: 100 }])
        detector.observe([{ kind: 'audio', bytesSent: 100 }])
        detector.reset()
        expect(detector.observe([{ kind: 'audio', bytesSent: 100 }])).toEqual(
            []
        )
        expect(detector.observe([{ kind: 'audio', bytesSent: 100 }])).toEqual(
            []
        )
        expect(detector.observe([{ kind: 'audio', bytesSent: 100 }])).toEqual([
            'audio',
        ])
    })
})

describe('hasConnectedRemote', () => {
    it('needs at least one remote participant and none of them reconnecting', () => {
        expect(hasConnectedRemote({})).toBe(false)
        expect(hasConnectedRemote({ participants: new Map() })).toBe(false)
        expect(
            hasConnectedRemote({
                participants: new Map([['PA1', { state: 'connected' }]]),
            })
        ).toBe(true)
        expect(
            hasConnectedRemote({
                participants: new Map([
                    ['PA1', { state: 'connected' }],
                    ['PA2', { state: 'reconnecting' }],
                ]),
            })
        ).toBe(false)
    })
})

/** A JWT whose payload carries the given claims; the signature is not checked by anyone here. */
function jwt(claims: Record<string, unknown>): string {
    const b64 = (o: unknown) =>
        window
            .btoa(JSON.stringify(o))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
    return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.sig`
}

describe('the access token before a rejoin', () => {
    const now = 1_700_000_000_000

    it('reads the expiry from the token', () => {
        expect(tokenExpiresAt(jwt({ exp: now / 1000 + 3600 }))).toBe(
            now + 3600 * 1000
        )
        expect(tokenExpiresAt('not a token')).toBeNull()
        expect(tokenExpiresAt(jwt({ iss: 'x' }))).toBeNull()
    })

    it('is usable only with a margin left for the disconnect and the connect', () => {
        expect(isTokenUsable(jwt({ exp: now / 1000 + 3600 }), now)).toBe(true)
        expect(
            isTokenUsable(jwt({ exp: (now + TOKEN_MARGIN_MS) / 1000 - 1 }), now)
        ).toBe(false)
        expect(isTokenUsable(jwt({ exp: now / 1000 - 1 }), now)).toBe(false)
        expect(isTokenUsable('not a token', now)).toBe(false)
    })
})
