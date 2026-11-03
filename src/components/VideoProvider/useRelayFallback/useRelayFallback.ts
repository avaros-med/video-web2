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
    hasConnectedRemote,
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
 * once bytes are actually flowing over the relayed rejoin, remembers in this browser that
 * relay is needed so later calls start that way. The other participant sees this side
 * drop and come back within a few seconds; nobody has to click anything.
 *
 * Only this browser's path is judged. While the SDK is reconnecting the room, while the
 * other participant is reconnecting, or while nobody else is in the room, flat byte
 * counters and a 53405 mean nothing about this side, so neither counts.
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
    /** The relayed rejoin connected; remember relay once its media is seen flowing. */
    const pendingRememberRef = useRef(false)
    /** Set while moveToRelay is rejoining, so the room effect knows the next room is that rejoin. */
    const relayRejoinRef = useRef(false)
    // A rejoin can still be in flight when the provider unmounts (user left the page).
    const mountedRef = useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])
    const setRelayActive = useCallback((value: boolean) => {
        relayActiveRef.current = value
        if (mountedRef.current) setIsRelayActive(value)
    }, [])

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
                setRelayActive(false)
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
            if (mountedRef.current) setIsReconnecting(true)
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
                setRelayActive(true)
                relayRejoinRef.current = true
                const relayedRoom = await connect(token, {
                    rtcConfiguration: { iceTransportPolicy: 'relay' },
                })
                if (sessionStartedAt) {
                    // @ts-ignore - see above
                    window.sessionStartedAt = sessionStartedAt
                }
                if (relayedRoom) {
                    // Remembered only once the relayed room's poll sees bytes leaving:
                    // a rejoin that connects but still carries nothing proves nothing.
                    pendingRememberRef.current = true
                    diagnosticsService.log('room', 'relay-fallback-connected')
                } else {
                    relayRejoinRef.current = false
                    pendingRememberRef.current = false
                    diagnosticsService.log('room', 'relay-fallback-failed', {
                        reason: 'rejoin-failed',
                    })
                    forgetRelay()
                    setRelayActive(false)
                }
            } finally {
                relayReconnectInProgress = false
                if (mountedRef.current) setIsReconnecting(false)
            }
        },
        [room, connect, tokenRef, setRelayActive]
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
        const isRelayRejoin = relayRejoinRef.current
        relayRejoinRef.current = false
        if (!isRelayRejoin) {
            // A new call runs the way useConnectionOptions started it, which is what
            // this browser remembers, whatever the previous call ended as; and nothing
            // is left to remember from a rejoin whose media never flowed.
            setRelayActive(isRelayRemembered())
            pendingRememberRef.current = false
        }
        const detector = new OutboundStallDetector(
            STALLED_POLLS_BEFORE_FALLBACK
        )
        let polls = 0
        let lastTotalBytes = -1
        let isActive = true

        // A media-connection failure only counts once the SDK's own ICE restart has
        // had RECONNECT_WAIT_MS to succeed; 'reconnected' (or leaving) cancels it.
        // The window also starts over whenever the other participant comes (back)
        // in: in a peer-to-peer room their outage fails this browser's ICE too, and
        // the restart after their return needs the whole window to prove itself.
        type Failure = { code: number; message: string }
        let reconnectTimer: number | null = null
        /** The failure a running window will judge. */
        let pendingFailure: Failure | null = null
        /** The failure the SDK reported last, kept until the room recovers or leaves. */
        let lastFailure: Failure | null = null
        const cancelReconnectWait = () => {
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer)
                reconnectTimer = null
            }
            pendingFailure = null
            lastFailure = null
        }
        const armReconnectWait = () => {
            reconnectTimer = window.setTimeout(() => {
                reconnectTimer = null
                const failure = pendingFailure
                pendingFailure = null
                if (!isActive || !failure) return
                // The other side going offline is their outage, not our network path.
                if (!hasConnectedRemote(room)) {
                    diagnosticsService.log('room', 'relay-fallback-skipped', {
                        reason: 'media-connection-failed',
                        why: 'remote participant reconnecting or absent',
                    })
                    return
                }
                moveToRelayRef.current('media-connection-failed', {
                    ...failure,
                    waitedSeconds: RECONNECT_WAIT_MS / 1000,
                })
            }, RECONNECT_WAIT_MS)
        }
        const onReconnecting = (error?: TwilioError) => {
            if (
                error?.code !== MEDIA_CONNECTION_FAILED ||
                reconnectTimer !== null
            ) {
                return
            }
            lastFailure = { code: error.code, message: error.message }
            pendingFailure = lastFailure
            armReconnectWait()
        }
        // The other participant is (back) in. A running window starts over; and if the
        // room is still reconnecting from a failure whose window already ended while
        // they were away, that failure gets a window now.
        const onRemoteBack = () => {
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer)
                reconnectTimer = null
            } else if (room.state !== 'reconnecting' || !lastFailure) {
                return
            }
            pendingFailure = lastFailure
            armReconnectWait()
        }
        room.on('reconnecting', onReconnecting)
        room.on('reconnected', cancelReconnectWait)
        room.on('disconnected', cancelReconnectWait)
        room.on('participantConnected', onRemoteBack)
        room.on('participantReconnected', onRemoteBack)

        const poll = async () => {
            // Nothing can flow while the SDK is reconnecting the room, while the other
            // participant is reconnecting, or while nobody else is here: start over,
            // grace included, since the media path only starts once they are in.
            if (room.state !== 'connected' || !hasConnectedRemote(room)) {
                detector.reset()
                lastTotalBytes = -1
                polls = 0
                return
            }
            polls += 1
            if (typeof room.getStats !== 'function') return
            let reports: StatsReport[]
            try {
                reports = await room.getStats()
            } catch {
                return
            }
            if (!isActive) return
            const samples = outboundSamples(room, reports)
            const totalBytes = samples.reduce((sum, s) => sum + s.bytesSent, 0)
            if (
                pendingRememberRef.current &&
                lastTotalBytes >= 0 &&
                totalBytes > lastTotalBytes
            ) {
                pendingRememberRef.current = false
                rememberRelay()
                diagnosticsService.log('room', 'relay-fallback-remembered')
            }
            lastTotalBytes = totalBytes
            if (polls <= GRACE_POLLS) return
            const stalled = detector.observe(samples)
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
            room.off('participantConnected', onRemoteBack)
            room.off('participantReconnected', onRemoteBack)
        }
    }, [room, isEnabled, setRelayActive])

    return { isReconnecting, isRelayActive }
}
