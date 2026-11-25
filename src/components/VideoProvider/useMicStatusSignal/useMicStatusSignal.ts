import { useEffect, useRef, useState } from 'react'
import { LocalDataTrack, RemoteParticipant, Room } from 'twilio-video'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'
import { MicStatus } from '../useAudioHealth/useAudioHealth'

/*
 * Tells the other participants when this browser's microphone is not reaching the
 * call for a reason they cannot see: the device paused it (an iPhone taking a phone
 * call, another app grabbing the microphone), it disconnected, or it stopped sending.
 *
 * Twilio signals a deliberate mute (track disabled) to everyone, but not these. The
 * audio keeps "flowing" as silence, so from the far side the person just goes quiet
 * with no icon. Here each browser publishes a small data track and reports its own
 * microphone status on it; the far side shows that on the participant's tile.
 *
 * The status is repeated on a heartbeat: a participant who joins later, or whose data
 * channel opened after the first send, catches up within one beat, and the receiver
 * drops a report that stops being repeated (the sender closed the tab or lost its
 * connection, so the report says nothing about now).
 */

export const MIC_STATUS_TRACK_NAME = 'mic-status'
export const MIC_STATUS_HEARTBEAT_MS = 3000
export const MIC_STATUS_STALE_MS = 10000

/** A microphone problem worth showing to other people. 'silent' is not one: a quiet room is normal. */
export type RemoteMicProblem = 'system-muted' | 'ended' | 'not-sending'
export type RemoteMicProblems = Record<string, RemoteMicProblem>

const PROBLEMS: RemoteMicProblem[] = ['system-muted', 'ended', 'not-sending']

export const toSignalledStatus = (status: MicStatus): RemoteMicProblem | 'ok' =>
    PROBLEMS.includes(status as RemoteMicProblem)
        ? (status as RemoteMicProblem)
        : 'ok'

export const encodeMicStatus = (status: MicStatus) =>
    JSON.stringify({ type: 'mic-status', status: toSignalledStatus(status) })

/** The reported status, or null when the message is not a mic status report we understand. */
export const decodeMicStatus = (
    data: unknown
): RemoteMicProblem | 'ok' | null => {
    if (typeof data !== 'string') return null
    try {
        const message = JSON.parse(data)
        if (!message || message.type !== 'mic-status') return null
        if (message.status === 'ok') return 'ok'
        return PROBLEMS.includes(message.status) ? message.status : null
    } catch {
        return null
    }
}

let micStatusTrack: LocalDataTrack | null | undefined

/*
 * One data track for the life of the page, published with the camera and microphone
 * when the room is joined (so it is part of the first negotiation, and a relay
 * fallback rejoin carries it too). Null when the browser cannot create one; the call
 * then works as before, without the status reports.
 */
export function getMicStatusTrack(): LocalDataTrack | null {
    if (micStatusTrack === undefined) {
        try {
            micStatusTrack = new LocalDataTrack({ name: MIC_STATUS_TRACK_NAME })
        } catch {
            micStatusTrack = null
        }
    }
    return micStatusTrack
}

export default function useMicStatusSignal(
    room: Room | null,
    micStatus: MicStatus
): RemoteMicProblems {
    const [remoteMicProblems, setRemoteMicProblems] = useState<
        RemoteMicProblems
    >({})
    const statusRef = useRef(micStatus)
    statusRef.current = micStatus

    // --- Report our own status ---------------------------------------------------
    useEffect(() => {
        if (!room) return
        const track = getMicStatusTrack()
        if (!track) return

        const send = () => {
            try {
                track.send(encodeMicStatus(statusRef.current))
            } catch {
                // Not published or no open channel yet: the next beat retries.
            }
        }
        send()
        const timer = setInterval(send, MIC_STATUS_HEARTBEAT_MS)
        return () => clearInterval(timer)
    }, [room])

    // A change goes out immediately instead of waiting for the next beat.
    const signalled = toSignalledStatus(micStatus)
    useEffect(() => {
        if (!room) return
        try {
            getMicStatusTrack()?.send(encodeMicStatus(signalled))
        } catch {}
    }, [room, signalled])

    // --- Collect what the others report ------------------------------------------
    useEffect(() => {
        if (!room) return

        const lastHeard = new Map<string, number>()

        const set = (identity: string, problem: RemoteMicProblem | null) =>
            setRemoteMicProblems(previous => {
                if ((previous[identity] ?? null) === problem) return previous
                const next = { ...previous }
                if (problem) {
                    next[identity] = problem
                    diagnosticsService.log('audio-out', 'remote-mic-problem', {
                        identity,
                        status: problem,
                    })
                } else {
                    delete next[identity]
                    diagnosticsService.log('audio-out', 'remote-mic-ok', {
                        identity,
                    })
                }
                return next
            })

        const onMessage = (
            data: string | ArrayBuffer,
            track: { name: string },
            participant: RemoteParticipant
        ) => {
            if (track.name !== MIC_STATUS_TRACK_NAME) return
            const status = decodeMicStatus(data)
            if (status === null) return
            lastHeard.set(participant.identity, Date.now())
            set(participant.identity, status === 'ok' ? null : status)
        }

        const onParticipantDisconnected = (participant: RemoteParticipant) => {
            lastHeard.delete(participant.identity)
            set(participant.identity, null)
        }

        const sweep = setInterval(() => {
            const now = Date.now()
            lastHeard.forEach((heardAt, identity) => {
                if (now - heardAt > MIC_STATUS_STALE_MS) {
                    lastHeard.delete(identity)
                    set(identity, null)
                }
            })
        }, MIC_STATUS_HEARTBEAT_MS)

        room.on('trackMessage', onMessage)
        room.on('participantDisconnected', onParticipantDisconnected)
        return () => {
            clearInterval(sweep)
            room.off('trackMessage', onMessage)
            room.off('participantDisconnected', onParticipantDisconnected)
            setRemoteMicProblems({})
        }
    }, [room])

    return remoteMicProblems
}
