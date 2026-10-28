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
                // tracks a moment later: nothing to clean up and nothing went wrong.
                if (isRelayReconnectInProgress()) return
                if (error) {
                    onError(error)
                }

                removeLocalAudioTrack()
                removeLocalVideoTrack()
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
