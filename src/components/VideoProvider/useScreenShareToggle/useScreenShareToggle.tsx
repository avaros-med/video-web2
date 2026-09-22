import { useState, useCallback, useRef, useEffect } from 'react'
import Video, { Room, TwilioError } from 'twilio-video'
import { ErrorCallback } from '../../../types'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'

// twilio-video error code raised on `room.reconnecting` when the media (ICE)
// connection is lost, as opposed to the signalling websocket.
const MEDIA_CONNECTION_ERROR_CODE = 53405

export const SCREEN_SHARE_PUBLISH_FAILED_MESSAGE =
    'Screen sharing could not be started. Your microphone and camera are unaffected. Please try again, and if the problem continues, leave and rejoin the call.'
export const SCREEN_SHARE_STOPPED_MEDIA_LOST_MESSAGE =
    'Screen sharing was stopped because the media connection was interrupted. Once the connection recovers you can start sharing again.'

export interface ScreenShareNotice {
    message: string
}

function describeDisplayTrack(track: MediaStreamTrack) {
    const settings = track.getSettings() as MediaTrackSettings & {
        displaySurface?: string
    }
    return {
        surface: settings.displaySurface,
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
    }
}

export default function useScreenShareToggle(
    room: Room | null,
    onError: ErrorCallback
) {
    const [isSharing, setIsSharing] = useState(false)
    const [notice, setNotice] = useState<ScreenShareNotice | null>(null)
    const stopScreenShareRef = useRef<(() => void) | null>(null)

    const dismissNotice = useCallback(() => setNotice(null), [])

    const shareScreen = useCallback(() => {
        diagnosticsService.log('screenshare', 'requested')
        navigator.mediaDevices
            .getDisplayMedia({
                audio: false,
                video: true,
            })
            .then(stream => {
                const mediaStreamTrack = stream.getVideoTracks()[0]

                // Until publishing is under way we are the only holder of the capture,
                // so anything that throws in between has to release it. Otherwise the
                // browser keeps showing its "sharing your screen" indicator for a share
                // that never started.
                let releaseTrack = () => mediaStreamTrack.stop()

                try {
                    // Wrap the raw MediaStreamTrack ourselves so we hold the same object
                    // the SDK publishes. This lets us stop and unpublish it reliably and
                    // keeps its logs quiet.
                    const screenTrack = new Video.LocalVideoTrack(
                        mediaStreamTrack,
                        {
                            name: 'screen', // Tracks are named so the UI can find them later
                            logLevel: 'off',
                        }
                    )

                    releaseTrack = () => {
                        screenTrack.stop()
                        mediaStreamTrack.stop()
                    }

                    // All video tracks are published with 'low' priority. The video track
                    // displayed in the 'MainParticipant' component has its priority raised
                    // to 'high' by the subscriber via track.setPriority().
                    room!.localParticipant
                        .publishTrack(screenTrack, { priority: 'low' })
                        .then(trackPublication => {
                            diagnosticsService.log(
                                'screenshare',
                                'published',
                                describeDisplayTrack(mediaStreamTrack)
                            )

                            stopScreenShareRef.current = () => {
                                stopScreenShareRef.current = null
                                room!.localParticipant.unpublishTrack(
                                    screenTrack
                                )
                                // TODO: remove this if the SDK is updated to emit this event
                                room!.localParticipant.emit(
                                    'trackUnpublished',
                                    trackPublication
                                )
                                releaseTrack()
                                setIsSharing(false)
                                diagnosticsService.log('screenshare', 'stopped')
                            }

                            // Fired when the user clicks the browser's own "Stop sharing" control.
                            mediaStreamTrack.onended = () =>
                                stopScreenShareRef.current?.()
                            setIsSharing(true)
                        })
                        .catch((error: TwilioError | Error) => {
                            // Publishing failed (renegotiation rejected, signalling error, etc.).
                            // Release the capture so the browser's sharing indicator disappears,
                            // leave mic/camera alone, and tell the user in plain language.
                            releaseTrack()
                            setIsSharing(false)
                            diagnosticsService.log(
                                'screenshare',
                                'publish-failed',
                                {
                                    code: error.code,
                                    message: error.message,
                                }
                            )
                            const friendlyError = new Error(
                                SCREEN_SHARE_PUBLISH_FAILED_MESSAGE
                            )
                            friendlyError.name = 'ScreenSharePublishFailed'
                            Object.assign(friendlyError, { code: error.code })
                            onError(friendlyError)
                        })
                } catch (error) {
                    // Wrapping or handing the track to the SDK threw synchronously, so
                    // no publish attempt is in flight to clean up after itself.
                    releaseTrack()
                    setIsSharing(false)
                    throw error
                }
            })
            .catch(error => {
                // Don't display an error if the user closes the screen share dialog
                if (
                    error.message === 'Permission denied by system' ||
                    (error.name !== 'AbortError' &&
                        error.name !== 'NotAllowedError')
                ) {
                    diagnosticsService.log('screenshare', 'capture-failed', {
                        name: error.name,
                        message: error.message,
                    })
                    console.error(error)
                    onError(error)
                } else {
                    diagnosticsService.log('screenshare', 'cancelled')
                }
            })
    }, [room, onError])

    const toggleScreenShare = useCallback(() => {
        if (room) {
            !isSharing ? shareScreen() : stopScreenShareRef.current?.()
        }
    }, [isSharing, shareScreen, room])

    // If the media connection drops while we are sharing, stop the share rather
    // than leaving a dead publication that has to be renegotiated on recovery.
    useEffect(() => {
        if (!room || !isSharing) return

        const handleReconnecting = (error?: TwilioError) => {
            if (error?.code !== MEDIA_CONNECTION_ERROR_CODE) return
            diagnosticsService.log('screenshare', 'stopped-media-lost', {
                code: error.code,
            })
            stopScreenShareRef.current?.()
            setNotice({ message: SCREEN_SHARE_STOPPED_MEDIA_LOST_MESSAGE })
        }

        room.on('reconnecting', handleReconnecting)
        return () => {
            room.off('reconnecting', handleReconnecting)
        }
    }, [room, isSharing])

    return [isSharing, toggleScreenShare, notice, dismissNotice] as const
}
