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
    isAutoRelayFallbackEnabled,
    isRelayRemembered,
    MEDIA_CONNECTION_FAILED,
    OutboundSample,
    OutboundStallDetector,
    rememberRelay,
} from '../../../utils/relayPolicy/relayPolicy'

export { isAutoRelayFallbackEnabled }

/*
 * Silent relay fallback.
 *
 * Detects the one failure peer-to-peer rooms cannot report on their own: this browser is
 * connected, its camera and microphone are live and unmuted, and yet no bytes leave the
 * peer connection (or twilio-video's own ICE restart fails to recover the media
 * connection). When that happens the hook leaves the room and rejoins it with the same
 * token and the same local tracks, forcing the ICE transport policy to 'relay', and,
 * once the relayed rejoin has actually connected, remembers in this browser that relay
 * is needed so later calls start that way. The other participant sees this side drop and
 * come back within a few seconds; nobody has to click anything.
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
/**
 * A 53405 'reconnecting' is the SDK starting an ICE restart, which often succeeds on
 * its own; only a restart that has not produced 'reconnected' within this window
 * counts as a failed media path.
 */
export const RECONNECT_WAIT_MS = 10000

let relayReconnectInProgress = false

/**
 * True while this hook is tearing one room down to rejoin it through relay. The
 * disconnect handler consults it so the camera and microphone tracks survive and no
 * error is shown.
 */
export function isRelayReconnectInProgress(): boolean {
    return relayReconnectInProgress
}

/** useRoom's connect: resolves with the room, or null when the SDK refused the connection. */
export type RoomConnect = (
    token: string,
    overrides?: Partial<ConnectOptions>
) => Promise<Room | null>

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
            relayReconnectInProgress = true
            setIsReconnecting(true)
            // The visit log's start time is the original join, not the rejoin.
            // @ts-ignore - set by useRoom
            const sessionStartedAt = window.sessionStartedAt
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
                const relayedRoom = await connect(token, {
                    rtcConfiguration: { iceTransportPolicy: 'relay' },
                })
                if (sessionStartedAt) {
                    // @ts-ignore - see above
                    window.sessionStartedAt = sessionStartedAt
                }
                if (relayedRoom) {
                    // Only a rejoin that actually connected is worth remembering.
                    rememberRelay()
                    diagnosticsService.log('room', 'relay-fallback-connected')
                } else {
                    diagnosticsService.log('room', 'relay-fallback-failed', {
                        reason: 'rejoin-failed',
                    })
                    forgetRelay()
                    relayActiveRef.current = false
                    setIsRelayActive(false)
                }
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

        // A media-connection failure only counts once the SDK's own ICE restart has
        // had RECONNECT_WAIT_MS to succeed; 'reconnected' (or leaving) cancels it.
        let reconnectTimer: number | null = null
        const cancelReconnectWait = () => {
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer)
                reconnectTimer = null
            }
        }
        const onReconnecting = (error?: TwilioError) => {
            if (
                error?.code !== MEDIA_CONNECTION_FAILED ||
                reconnectTimer !== null
            ) {
                return
            }
            const { code, message } = error
            reconnectTimer = window.setTimeout(() => {
                reconnectTimer = null
                if (!isActive) return
                moveToRelayRef.current('media-connection-failed', {
                    code,
                    message,
                    waitedSeconds: RECONNECT_WAIT_MS / 1000,
                })
            }, RECONNECT_WAIT_MS)
        }
        room.on('reconnecting', onReconnecting)
        room.on('reconnected', cancelReconnectWait)
        room.on('disconnected', cancelReconnectWait)

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
            cancelReconnectWait()
            room.off('reconnecting', onReconnecting)
            room.off('reconnected', cancelReconnectWait)
            room.off('disconnected', cancelReconnectWait)
        }
    }, [room, isEnabled])

    return { isReconnecting, isRelayActive }
}
