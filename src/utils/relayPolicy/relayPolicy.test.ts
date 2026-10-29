import {
    decideFallback,
    forgetRelay,
    isRelayRemembered,
    OutboundStallDetector,
    rememberRelay,
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
