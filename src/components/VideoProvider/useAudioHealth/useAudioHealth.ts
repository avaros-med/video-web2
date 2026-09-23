import { useCallback, useEffect, useRef, useState } from 'react'
import {
    LocalAudioTrack,
    LocalVideoTrack,
    RemoteAudioTrackStats,
    LocalAudioTrackStats,
    Room,
    StatsReport,
} from 'twilio-video'
import { SELECTED_AUDIO_INPUT_KEY } from '../../../constants'
import useIsTrackEnabled from '../../../hooks/useIsTrackEnabled/useIsTrackEnabled'
import useMediaStreamTrack from '../../../hooks/useMediaStreamTrack/useMediaStreamTrack'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'
import { subscribeToAudioLevel } from '../../ParticipantInfo/audioLevelStore'

/*
 * Watches the health of audio in both directions and exposes a status the UI can
 * surface, plus a one-click microphone restart.
 *
 * Local microphone:
 *   - 'system-muted': the browser fired `mute` on the capture track. The OS or
 *     another application took the device; nothing is being captured.
 *   - 'ended': the capture track ended (device unplugged, permission revoked).
 *   - 'silent': the track is live but has produced digital silence for a while.
 *     A real microphone always has a noise floor, so this means capture is dead.
 *   - 'not-sending': the microphone is capturing but the SDK reports no bytes
 *     leaving the peer connection. This is the "mic works but nobody hears me"
 *     case that a failed renegotiation (for example after starting screen share)
 *     produces.
 *
 * Remote audio: a subscribed, enabled remote audio track whose bytesReceived
 * stops increasing for several polls is reported so the user can check their
 * output device or ask the other party to check their microphone.
 */

export type MicStatus =
    | 'ok'
    | 'system-muted'
    | 'ended'
    | 'silent'
    | 'not-sending'

export interface RemoteAudioAlert {
    identity: string
    /**
     * The publication the alert is about. Alerts are keyed by track rather than
     * by identity because a participant who rejoins gets a fresh identity, and
     * a replaced track gets a fresh SID while the identity stays put.
     */
    trackSid: string
}

/*
 * Each direction keeps two separate facts: whether there is a problem, and
 * whether the user has put the callout for that problem away. The problem
 * (`micStatus`, `remoteAudioAlert`) drives the tile badges and the pulsing mic
 * button for as long as it lasts. The callout is shown only while the problem
 * exists and has not been hidden, and hiding is forgotten the moment the problem
 * clears, so a fresh occurrence always gets a fresh callout.
 */
export interface AudioHealth {
    micStatus: MicStatus
    isMicAlertVisible: boolean
    /** Put the microphone callout away. The problem, badge and button stay. */
    dismissMicAlert: () => void
    /** Bring a dismissed microphone callout back, e.g. from the pulsing button. */
    showMicAlert: () => void
    restartMic: () => Promise<void>
    remoteAudioAlert: RemoteAudioAlert | null
    isRemoteAlertVisible: boolean
    /**
     * Put the remote audio callout away, by the close control or the auto-hide
     * timeout. The tile badge stays until the track recovers or goes away.
     */
    dismissRemoteAudioAlert: () => void
}

const SILENCE_THRESHOLD_MS = 10000
const STATS_POLL_MS = 3000
const STALLED_POLLS_BEFORE_ALERT = 3 // ~9 seconds

interface ByteCounter {
    bytes: number
    stalledPolls: number
}

function collectStats<T>(
    reports: StatsReport[],
    pick: (report: StatsReport) => T[]
): T[] {
    return reports.reduce<T[]>((all, report) => all.concat(pick(report)), [])
}

export default function useAudioHealth(
    room: Room | null,
    localTracks: (LocalAudioTrack | LocalVideoTrack)[]
): AudioHealth {
    const audioTrack = localTracks.find(track => track.kind === 'audio') as
        | LocalAudioTrack
        | undefined
    const mediaStreamTrack = useMediaStreamTrack(audioTrack)
    const isMicEnabled = useIsTrackEnabled(audioTrack)

    const [micStatus, setMicStatus] = useState<MicStatus>('ok')
    const [hiddenMicStatus, setHiddenMicStatus] = useState<MicStatus | null>(
        null
    )
    const [
        remoteAudioAlert,
        setRemoteAudioAlert,
    ] = useState<RemoteAudioAlert | null>(null)
    const [hiddenRemoteTrackSid, setHiddenRemoteTrackSid] = useState<
        string | null
    >(null)

    const isMicAlertVisible =
        micStatus !== 'ok' && micStatus !== hiddenMicStatus
    // An open 'not-sending' episode: bytes were last seen stalled and have not
    // been seen flowing since. Kept in a ref because two effects need it: the
    // stats poll that opens and closes it, and the track-event and silence
    // handlers, which fall back to it when a status that outranks 'not-sending'
    // clears rather than assuming the microphone is fine.
    const isNotSendingOpenRef = useRef(false)
    const isMicEnabledRef = useRef(isMicEnabled)
    isMicEnabledRef.current = isMicEnabled

    const statusAfterRecovery = useCallback(
        (): MicStatus =>
            isNotSendingOpenRef.current && isMicEnabledRef.current
                ? 'not-sending'
                : 'ok',
        []
    )

    const isRemoteAlertVisible =
        remoteAudioAlert !== null &&
        remoteAudioAlert.trackSid !== hiddenRemoteTrackSid

    // --- Browser-level capture track events -------------------------------------
    useEffect(() => {
        if (!mediaStreamTrack) return

        const label = mediaStreamTrack.label
        const onMute = () => {
            diagnosticsService.log('mic', 'system-muted', { label })
            setMicStatus('system-muted')
        }
        const onUnmute = () => {
            diagnosticsService.log('mic', 'recovered', { from: 'system-muted' })
            setMicStatus(previous =>
                previous === 'system-muted' ? statusAfterRecovery() : previous
            )
        }
        const onEnded = () => {
            diagnosticsService.log('mic', 'ended', { label })
            setMicStatus('ended')
        }

        mediaStreamTrack.addEventListener('mute', onMute)
        mediaStreamTrack.addEventListener('unmute', onUnmute)
        mediaStreamTrack.addEventListener('ended', onEnded)

        // A restarted track starts fresh, so reflect its current state immediately.
        if (mediaStreamTrack.readyState === 'ended') {
            onEnded()
        } else if (mediaStreamTrack.muted) {
            onMute()
        } else {
            setMicStatus('ok')
        }

        return () => {
            mediaStreamTrack.removeEventListener('mute', onMute)
            mediaStreamTrack.removeEventListener('unmute', onUnmute)
            mediaStreamTrack.removeEventListener('ended', onEnded)
        }
    }, [mediaStreamTrack, statusAfterRecovery])

    // --- Digital silence detection ----------------------------------------------
    const shouldMonitorSilence =
        Boolean(room && mediaStreamTrack && isMicEnabled) &&
        (micStatus === 'ok' || micStatus === 'silent')

    useEffect(() => {
        if (!shouldMonitorSilence || !mediaStreamTrack) return

        let silentSince: number | null = null
        const unsubscribe = subscribeToAudioLevel(mediaStreamTrack, sample => {
            if (sample.isSilent) {
                if (silentSince === null) {
                    silentSince = Date.now()
                } else if (Date.now() - silentSince >= SILENCE_THRESHOLD_MS) {
                    setMicStatus(previous => {
                        if (previous === 'ok') {
                            diagnosticsService.log('mic', 'silent', {
                                label: mediaStreamTrack.label,
                                seconds: SILENCE_THRESHOLD_MS / 1000,
                            })
                            return 'silent'
                        }
                        return previous
                    })
                }
            } else {
                silentSince = null
                setMicStatus(previous => {
                    if (previous === 'silent') {
                        diagnosticsService.log('mic', 'recovered', {
                            from: 'silent',
                        })
                        return statusAfterRecovery()
                    }
                    return previous
                })
            }
        })
        return unsubscribe
    }, [shouldMonitorSilence, mediaStreamTrack, statusAfterRecovery])

    // --- Peer connection byte counters (both directions) ------------------------
    useEffect(() => {
        if (!room) return

        let isActive = true
        const localCounter: ByteCounter = { bytes: 0, stalledPolls: 0 }
        const remoteCounters = new Map<string, ByteCounter>()

        const checkLocalAudio = (stats: LocalAudioTrackStats[]) => {
            const track = room.localParticipant.audioTracks.values().next()
                .value
            const localTrack = track?.track as LocalAudioTrack | undefined
            const captureTrack = localTrack?.mediaStreamTrack
            if (
                !localTrack ||
                !captureTrack ||
                !localTrack.isEnabled ||
                captureTrack.muted ||
                captureTrack.readyState !== 'live'
            ) {
                // Not capturing, so the byte counter says nothing about health.
                // The alert stands down, but an open episode is not closed: nothing
                // has shown bytes leaving again, and calling this a recovery would
                // put a false 'recovered' in the visit log on every mute.
                localCounter.stalledPolls = 0
                setMicStatus(previous =>
                    previous === 'not-sending' ? 'ok' : previous
                )
                return
            }
            const stat = stats.find(s => s.trackSid === track.trackSid)
            if (!stat || stat.bytesSent === null) return

            if (stat.bytesSent <= localCounter.bytes) {
                localCounter.stalledPolls += 1
                if (
                    localCounter.stalledPolls === STALLED_POLLS_BEFORE_ALERT &&
                    !isNotSendingOpenRef.current
                ) {
                    // Open the episode once. After a mute the counter restarts
                    // while the episode may still be open; that is the same
                    // problem continuing, not a new one to log.
                    isNotSendingOpenRef.current = true
                    diagnosticsService.log('mic', 'not-sending', {
                        bytesSent: stat.bytesSent,
                        seconds:
                            (STALLED_POLLS_BEFORE_ALERT * STATS_POLL_MS) / 1000,
                    })
                }
                if (localCounter.stalledPolls >= STALLED_POLLS_BEFORE_ALERT) {
                    // Raised on every stalled poll, not just the one that crosses
                    // the threshold: another problem may own the status at that
                    // moment, and when it clears the microphone is still not
                    // reaching the room.
                    setMicStatus(previous =>
                        previous === 'ok' ? 'not-sending' : previous
                    )
                }
            } else {
                // Bytes leaving the peer connection is the only evidence that
                // counts as a recovery, whatever the stall counter reads.
                if (isNotSendingOpenRef.current) {
                    isNotSendingOpenRef.current = false
                    diagnosticsService.log('mic', 'recovered', {
                        from: 'not-sending',
                    })
                }
                setMicStatus(previous =>
                    previous === 'not-sending' ? 'ok' : previous
                )
                localCounter.stalledPolls = 0
            }
            localCounter.bytes = stat.bytesSent
        }

        const checkRemoteAudio = (stats: RemoteAudioTrackStats[]) => {
            const seenSids = new Set<string>()
            room.participants.forEach(participant => {
                participant.audioTracks.forEach(publication => {
                    const track = publication.track
                    const sid = publication.trackSid
                    if (!track || !track.isEnabled) return
                    const stat = stats.find(s => s.trackSid === sid)
                    if (!stat || stat.bytesReceived === null) return
                    seenSids.add(sid)

                    const counter = remoteCounters.get(sid) ?? {
                        bytes: -1,
                        stalledPolls: 0,
                    }
                    if (
                        counter.bytes >= 0 &&
                        stat.bytesReceived <= counter.bytes
                    ) {
                        counter.stalledPolls += 1
                        if (
                            counter.stalledPolls === STALLED_POLLS_BEFORE_ALERT
                        ) {
                            diagnosticsService.log(
                                'audio-out',
                                'remote-audio-stalled',
                                {
                                    identity: participant.identity,
                                    trackSid: sid,
                                }
                            )
                        }
                        if (
                            counter.stalledPolls >= STALLED_POLLS_BEFORE_ALERT
                        ) {
                            // There is one alert slot. Whoever stalls first keeps it
                            // until they recover or go away; a second stalled
                            // participant waits rather than silently replacing them,
                            // and takes the slot on a later poll once it is free.
                            // Dismissal hides the callout but does not free the slot.
                            setRemoteAudioAlert(
                                alert =>
                                    alert ?? {
                                        identity: participant.identity,
                                        trackSid: sid,
                                    }
                            )
                        }
                    } else {
                        if (
                            counter.stalledPolls >= STALLED_POLLS_BEFORE_ALERT
                        ) {
                            diagnosticsService.log(
                                'audio-out',
                                'remote-audio-recovered',
                                { identity: participant.identity }
                            )
                            setRemoteAudioAlert(alert =>
                                alert?.trackSid === sid ? null : alert
                            )
                        }
                        counter.stalledPolls = 0
                    }
                    counter.bytes = stat.bytesReceived
                    remoteCounters.set(sid, counter)
                })
            })
            // Forget tracks that were unsubscribed or disabled. An alert about a
            // track that is gone has nothing left to say — the participant has left,
            // muted themselves, or republished — so it goes with the counter.
            Array.from(remoteCounters.keys())
                .filter(sid => !seenSids.has(sid))
                .forEach(sid => {
                    remoteCounters.delete(sid)
                    setRemoteAudioAlert(alert =>
                        alert?.trackSid === sid ? null : alert
                    )
                })
        }

        const poll = async () => {
            if (room.state !== 'connected') return
            let reports: StatsReport[]
            try {
                reports = await room.getStats()
            } catch {
                return
            }
            // getStats may resolve after this effect has been torn down.
            if (!isActive) return
            checkLocalAudio(
                collectStats(reports, report => report.localAudioTrackStats)
            )
            checkRemoteAudio(
                collectStats(reports, report => report.remoteAudioTrackStats)
            )
        }

        const timer = window.setInterval(poll, STATS_POLL_MS)
        return () => {
            isActive = false
            window.clearInterval(timer)
        }
    }, [room])

    // --- Callout visibility ------------------------------------------------------
    // Hiding is tied to the specific problem that was on screen. Once that
    // problem clears the record is dropped, so the next occurrence is shown again
    // rather than inheriting a dismissal from last time.
    useEffect(() => {
        if (micStatus === 'ok') setHiddenMicStatus(null)
    }, [micStatus])

    useEffect(() => {
        if (remoteAudioAlert === null) setHiddenRemoteTrackSid(null)
    }, [remoteAudioAlert])

    const dismissMicAlert = useCallback(() => setHiddenMicStatus(micStatus), [
        micStatus,
    ])
    const showMicAlert = useCallback(() => setHiddenMicStatus(null), [])

    const dismissRemoteAudioAlert = useCallback(
        () => setHiddenRemoteTrackSid(remoteAudioAlert?.trackSid ?? null),
        [remoteAudioAlert]
    )

    const restartMic = useCallback(async () => {
        if (!audioTrack) return
        diagnosticsService.log('mic', 'restart-requested', { from: micStatus })
        const selectedDeviceId = window.localStorage.getItem(
            SELECTED_AUDIO_INPUT_KEY
        )
        try {
            await audioTrack.restart(
                selectedDeviceId
                    ? { deviceId: { exact: selectedDeviceId } }
                    : {}
            )
        } catch (error) {
            // The preferred device may be gone; fall back to the system default.
            diagnosticsService.log('mic', 'restart-fallback', {
                message: (error as Error).message,
            })
            try {
                await audioTrack.restart({})
            } catch (fallbackError) {
                // Both attempts failed. Record it before rejecting: a microphone we
                // could not recover is exactly what the timeline exists to explain.
                diagnosticsService.log('mic', 'restart-failed', {
                    message: (error as Error).message,
                    fallbackMessage: (fallbackError as Error).message,
                })
                throw fallbackError
            }
        }
        diagnosticsService.log('mic', 'restarted', {
            label: audioTrack.mediaStreamTrack.label,
        })
        setMicStatus('ok')
    }, [audioTrack, micStatus])

    return {
        micStatus,
        isMicAlertVisible,
        dismissMicAlert,
        showMicAlert,
        restartMic,
        remoteAudioAlert,
        isRemoteAlertVisible,
        dismissRemoteAudioAlert,
    }
}
