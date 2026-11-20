import { useCallback, useEffect, useState } from 'react'
import { isNotFound, videoService } from '../services/http/video.service'
import { VideoRoom } from '../services/models/VideoRoom.model'

export type VideoRoomStatus = 'loading' | 'found' | 'not_found' | 'unavailable'

export interface VideoRoomHookState {
    videoRoom: VideoRoom | null
    status: VideoRoomStatus
    reload(): void
}

/**
 * The room the page's address names, read once from ehr: what the pre-join screen shows,
 * whether a PIN is asked, and whether this browser is the provider's (ehr knows them by
 * their JWT). `not_found` for a room ehr does not have, or a name with no clinic in it;
 * `unavailable` when ehr could not be asked.
 */
export const useVideoRoom = (
    roomName: string | undefined
): VideoRoomHookState => {
    const [videoRoom, setVideoRoom] = useState<VideoRoom | null>(null)
    const [status, setStatus] = useState<VideoRoomStatus>('loading')
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        if (!roomName) {
            setVideoRoom(null)
            setStatus('not_found')
            return
        }
        let current = true
        setStatus('loading')
        videoService
            .getRoom(roomName)
            .then(room => {
                if (!current) return
                setVideoRoom(room)
                setStatus('found')
            })
            .catch(error => {
                if (!current) return
                setVideoRoom(null)
                setStatus(
                    isNotFound(error) || error?.name === 'EhrUrlError'
                        ? 'not_found'
                        : 'unavailable'
                )
            })
        return () => {
            current = false
        }
    }, [roomName, attempt])

    const reload = useCallback(() => setAttempt(n => n + 1), [])

    return { videoRoom, status, reload }
}
