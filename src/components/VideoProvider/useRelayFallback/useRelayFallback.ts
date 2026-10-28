import {
    MutableRefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    ConnectOptions,
    LocalAudioTrack,
    LocalTrackPublication,
    LocalVideoTrack,
    Room,
    StatsReport,
    TwilioError,
} from 'twilio-video'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'
import {
    decideFallback,
    forgetRelay,
    isRelayRemembered,
    MEDIA_CONNECTION_FAILED,
    OutboundSample,
    OutboundStallDetector,
    rememberRelay,
} from '../../../utils/relayPolicy/relayPolicy'

/*
 * Silent relay fallback.
 *
 * Detects the one failure peer-to-peer rooms cannot report on their own: this browser is
 * connected, its camera and microphone are live and unmuted, and yet no bytes leave the
 * peer connection (or twilio-video reports that the media connection failed). When that
 * happens the hook leaves the room and rejoins it with the same token and the same local
 * tracks, forcing the ICE transport policy to 'relay', and remembers in this browser that
 * relay is needed so later calls start that way. The other participant sees this side
 * drop and come back within a few seconds; nobody has to click anything.
 *
 * Once per call. If a call that is already relayed stalls too, relay is not the answer:
 * the memory is cleared and the usual microphone/audio alerts take over.
 */

export interface RelayFallback {
    /** True while the call is being moved to a relayed connection. */
    isReconnecting: boolean
    /** True when the current call runs with iceTransportPolicy 'relay'. */
    isRelayActive: boolean
}

export const STATS_POLL_MS = 3000
/** ICE is still settling right after connect; zero bytes then is normal. */
export const START_GRACE_MS = 15000
const GRACE_POLLS = Math.ceil(START_GRACE_MS / STATS_POLL_MS)
export const STALLED_POLLS_BEFORE_FALLBACK = 4 // ~12 s
/** How long to wait for the SDK's 'disconnected' before rejoining anyway. */
const DISCONNECT_WAIT_MS = 3000

export function isAutoRelayFallbackEnabled(): boolean {
    return process.env.REACT_APP_AUTO_RELAY_FALLBACK !== 'false'
}

let relayReconnectInProgress = false

/**
 * True while this hook is tearing one room down to rejoin it through relay. The
 * disconnect handler consults it so the local tracks survive and no error is shown.
 */
export function isRelayReconnectInProgress(): boolean {
    return relayReconnectInProgress
}

export type RoomConnect = (
    token: string,
    overrides?: Partial<ConnectOptions>
) => Promise<void>

/**
 * Bytes sent per kind for the local camera and microphone tracks that are currently
 * able to send: published, enabled, live and not muted by the OS. Screen share is left
 * out (it is optional and has its own handling).
 */
export function outboundSamples(
    room: Room,
    reports: StatsReport[]
): OutboundSample[] {
    const publications: LocalTrackPublication[] = []
    room.localParticipant?.audioTracks?.forEach(p => publications.push(p))
    room.localParticipant?.videoTracks?.forEach(p => publications.push(p))
    const samples: OutboundSample[] = []
    publications.forEach(publication => {
        const track = publication.track as
            | LocalAudioTrack
            | LocalVideoTrack
            | null
        if (
            !track ||
            !track.isEnabled ||
            track.name.includes('screen') ||
            track.mediaStreamTrack.readyState !== 'live' ||
            track.mediaStreamTrack.muted
        ) {
            return
        }
        for (const report of reports) {
            const stats: { trackSid: string; bytesSent: number | null }[] =
                track.kind === 'audio'
                    ? report.localAudioTrackStats
                    : report.localVideoTrackStats
            const stat = stats.find(s => s.trackSid === publication.trackSid)
            if (stat && stat.bytesSent !== null) {
                samples.push({ kind: track.kind, bytesSent: stat.bytesSent })
                return
            }
        }
    })
    return samples
}

export default function useRelayFallback(
    room: Room | null,
    connect: RoomConnect,
    tokenRef: MutableRefObject<string | null>,
    isEnabled: boolean = isAutoRelayFallbackEnabled()
): RelayFallback {
    const [isReconnecting, setIsReconnecting] = useState(false)
    const [isRelayActive, setIsRelayActive] = useState(isRelayRemembered)
    const relayActiveRef = useRef(isRelayActive)
    const attemptedRef = useRef(false)

    const moveToRelay = useCallback(
        async (reason: string, data: Record<string, unknown>) => {
            if (!room) return
            const decision = decideFallback(
                relayActiveRef.current,
                attemptedRef.current
            )
            if (decision === 'none') return
            attemptedRef.current = true

            if (decision === 'give-up-relay') {
                diagnosticsService.log('room', 'relay-fallback-failed', {
                    reason,
                    ...data,
                })
                forgetRelay()
                relayActiveRef.current = false
                setIsRelayActive(false)
                return
            }

            const token = tokenRef.current
            if (!token) {
                diagnosticsService.log('room', 'relay-fallback-skipped', {
                    reason,
                    why: 'no token',
                })
                return
            }

            diagnosticsService.log('room', 'relay-fallback', {
                reason,
                ...data,
            })
            rememberRelay()
            relayReconnectInProgress = true
            setIsReconnecting(true)
            try {
                await new Promise<void>(resolve => {
                    const timer = window.setTimeout(resolve, DISCONNECT_WAIT_MS)
                    room.once('disconnected', () => {
                        window.clearTimeout(timer)
                        resolve()
                    })
                    room.disconnect()
                })
                relayActiveRef.current = true
                setIsRelayActive(true)
                await connect(token, {
                    rtcConfiguration: { iceTransportPolicy: 'relay' },
                })
                diagnosticsService.log('room', 'relay-fallback-connected')
            } finally {
                relayReconnectInProgress = false
                setIsReconnecting(false)
            }
        },
        [room, connect, tokenRef]
    )

    // Always the latest moveToRelay, so the room effect below only re-runs for a new room.
    const moveToRelayRef = useRef(moveToRelay)
    useEffect(() => {
        moveToRelayRef.current = moveToRelay
    }, [moveToRelay])

    useEffect(() => {
        if (!room || !isEnabled) return
        // A new room is a new call (or the relayed rejoin): one attempt each.
        attemptedRef.current = false
        const detector = new OutboundStallDetector(
            STALLED_POLLS_BEFORE_FALLBACK
        )
        let polls = 0
        let isActive = true

        const onReconnecting = (error?: TwilioError) => {
            if (error?.code === MEDIA_CONNECTION_FAILED) {
                moveToRelayRef.current('media-connection-failed', {
                    code: error.code,
                    message: error.message,
                })
            }
        }
        room.on('reconnecting', onReconnecting)

        const poll = async () => {
            polls += 1
            if (polls <= GRACE_POLLS) return
            if (typeof room.getStats !== 'function') return
            let reports: StatsReport[]
            try {
                reports = await room.getStats()
            } catch {
                return
            }
            if (!isActive) return
            const stalled = detector.observe(outboundSamples(room, reports))
            if (stalled.length) {
                moveToRelayRef.current('outbound-stall', {
                    kinds: stalled.join('+'),
                    seconds:
                        (STALLED_POLLS_BEFORE_FALLBACK * STATS_POLL_MS) / 1000,
                })
            }
        }
        const timer = window.setInterval(poll, STATS_POLL_MS)

        return () => {
            isActive = false
            window.clearInterval(timer)
            room.off('reconnecting', onReconnecting)
        }
    }, [room, isEnabled])

    return { isReconnecting, isRelayActive }
}
