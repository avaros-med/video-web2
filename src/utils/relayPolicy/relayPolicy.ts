import { FORCE_RELAY_KEY } from '../../constants'

/*
 * Relay fallback policy.
 *
 * Rooms are peer-to-peer, so each participant's media normally travels straight to the
 * other browser. Behind some routers that direct path passes ICE's connectivity checks
 * and then carries nothing in one direction: the other side sees and hears nobody while
 * this side looks fine. Forcing the ICE transport policy to 'relay' sends the media via
 * Twilio's TURN servers instead, which almost always cures it, at the cost of a little
 * latency. The helpers here decide when that is warranted and remember the outcome per
 * browser so the next call starts relayed without waiting for a failure.
 */

/** twilio-video error raised when the media connection cannot be (re)established. */
export const MEDIA_CONNECTION_FAILED = 53405

/** Kill switch for the whole feature: REACT_APP_AUTO_RELAY_FALLBACK=false. */
export function isAutoRelayFallbackEnabled(): boolean {
    return process.env.REACT_APP_AUTO_RELAY_FALLBACK !== 'false'
}

export function isRelayRemembered(): boolean {
    try {
        return window.localStorage.getItem(FORCE_RELAY_KEY) === 'true'
    } catch {
        return false
    }
}

export function rememberRelay(): void {
    try {
        window.localStorage.setItem(FORCE_RELAY_KEY, 'true')
    } catch {
        // storage unavailable (private mode, blocked): the fallback still works for this call
    }
}

export function forgetRelay(): void {
    try {
        window.localStorage.removeItem(FORCE_RELAY_KEY)
    } catch {
        // see rememberRelay
    }
}

export interface OutboundSample {
    /** 'audio' or 'video' */
    kind: string
    bytesSent: number
}

/**
 * Watches the bytes this browser sends per track kind, one sample per poll, and reports
 * the kinds whose counter has not moved for `pollsBeforeStall` consecutive polls. The
 * first sample of a kind only sets its baseline. A kind missing from a poll (track
 * disabled or gone) is forgotten, so re-enabling it starts fresh.
 */
export class OutboundStallDetector {
    private counters = new Map<
        string,
        { bytes: number; stalledPolls: number }
    >()

    constructor(private pollsBeforeStall: number) {}

    observe(samples: OutboundSample[]): string[] {
        const stalled: string[] = []
        const seen = new Set<string>()
        for (const sample of samples) {
            seen.add(sample.kind)
            const counter = this.counters.get(sample.kind) ?? {
                bytes: -1,
                stalledPolls: 0,
            }
            if (counter.bytes >= 0 && sample.bytesSent <= counter.bytes) {
                counter.stalledPolls += 1
            } else {
                counter.stalledPolls = 0
            }
            counter.bytes = sample.bytesSent
            this.counters.set(sample.kind, counter)
            if (counter.stalledPolls >= this.pollsBeforeStall) {
                stalled.push(sample.kind)
            }
        }
        Array.from(this.counters.keys()).forEach(kind => {
            if (!seen.has(kind)) this.counters.delete(kind)
        })
        return stalled
    }
}

export type FallbackDecision = 'move-to-relay' | 'give-up-relay' | 'none'

/**
 * What to do when outbound media has stalled or the media connection failed:
 * move the call to relay once per call; if the call is already relayed, relay is not
 * the answer, so stop remembering it (and let the existing alerts take over).
 */
export function decideFallback(
    isRelayActive: boolean,
    alreadyAttempted: boolean
): FallbackDecision {
    if (alreadyAttempted) return 'none'
    return isRelayActive ? 'give-up-relay' : 'move-to-relay'
}
