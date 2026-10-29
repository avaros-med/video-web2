import { Room, TwilioError } from 'twilio-video'
import { useEffect } from 'react'

import { Callback } from '../../../types'
import { isRelayReconnectInProgress } from '../useRelayFallback/useRelayFallback'

export default function useHandleRoomDisconnection(
    room: Room | null,
    onError: Callback,
    removeLocalAudioTrack: () => void,
    removeLocalVideoTrack: () => void,
    isSharingScreen: boolean,
    toggleScreenShare: () => void
) {
    useEffect(() => {
        if (room) {
            const onDisconnected = (_: Room, error: TwilioError) => {
                // useRelayFallback leaves the room on purpose and rejoins it with the same
                // camera and microphone tracks a moment later: those stay and nothing went
                // wrong. A screen share is not carried over, so it is stopped like any other
                // disconnect and the user starts it again if they still need it.
                const isRelayRejoin = isRelayReconnectInProgress()
                if (error && !isRelayRejoin) {
                    onError(error)
                }
                if (!isRelayRejoin) {
                    removeLocalAudioTrack()
                    removeLocalVideoTrack()
                }
                if (isSharingScreen) {
                    toggleScreenShare()
                }
            }

            room.on('disconnected', onDisconnected)
            return () => {
                room.off('disconnected', onDisconnected)
            }
        }
    }, [
        room,
        onError,
        removeLocalAudioTrack,
        removeLocalVideoTrack,
        isSharingScreen,
        toggleScreenShare,
    ])
}
