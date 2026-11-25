import { useContext } from 'react'
import { Participant } from 'twilio-video'
import { VideoContext } from '../../components/VideoProvider'
import { MediaAlertTone } from '../../components/MediaAlertCallout/MediaAlertCallout'

export interface TileAudioAlert {
    tone: MediaAlertTone
    label: string
    icon: string
}

export const LOCAL_MIC_ALERT_LABEL = 'Muted to others'
// The device (phone, tablet or computer) paused the microphone, not the person.
export const LOCAL_MIC_PAUSED_LABEL = 'Mic paused by your device'
export const REMOTE_AUDIO_ALERT_LABEL = 'No audio received'

/*
 * Tells a participant tile whether to show an audio problem badge: the local tile
 * when our microphone is not reaching the call, a remote tile when their audio has
 * stopped arriving. Reads the context directly so tiles rendered outside a
 * VideoProvider (tests, storybook fragments) simply show nothing.
 */
export default function useTileAudioAlert(
    participant: Participant | undefined,
    isLocalParticipant: boolean | undefined
): TileAudioAlert | null {
    const context = useContext(VideoContext)
    const audioHealth = context?.audioHealth
    if (!audioHealth || !participant) return null

    if (isLocalParticipant) {
        if (audioHealth.micStatus === 'ok') return null
        return {
            tone: 'error',
            label:
                audioHealth.micStatus === 'system-muted'
                    ? LOCAL_MIC_PAUSED_LABEL
                    : LOCAL_MIC_ALERT_LABEL,
            icon: 'mic_off',
        }
    }

    return audioHealth.remoteAudioAlert?.identity === participant.identity
        ? { tone: 'info', label: REMOTE_AUDIO_ALERT_LABEL, icon: 'volume_off' }
        : null
}
