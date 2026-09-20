import useLocalAudioToggle from '../../../hooks/useLocalAudioToggle/useLocalAudioToggle'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { IconButton } from '../../UI/IconButton'

export const MIC_ALERT_TOOLTIP = 'Microphone problem, see the message above'

export default function ToggleAudioButton(props: {
    disabled?: boolean
    className?: string
}) {
    const [isAudioEnabled, toggleAudioEnabled] = useLocalAudioToggle()
    const { localTracks, audioHealth } = useVideoContext()
    const hasAudioTrack = localTracks.some(track => track.kind === 'audio')

    // The microphone is not reaching the call: the button turns red and pulses
    // while MediaHealthNotifications explains what to do just above it.
    const hasMicAlert = Boolean(audioHealth && audioHealth.micStatus !== 'ok')

    let intent: 'text' | 'danger' | 'alert' = isAudioEnabled ? 'text' : 'danger'
    if (hasMicAlert) intent = 'alert'

    let tooltip = isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'
    if (hasMicAlert) tooltip = MIC_ALERT_TOOLTIP

    return (
        <IconButton
            classes={props.className}
            intent={intent}
            icon={isAudioEnabled && !hasMicAlert ? 'mic' : 'mic_off'}
            onClick={toggleAudioEnabled}
            disabled={!hasAudioTrack || props.disabled}
            tooltipContent={tooltip}
            tooltipPosition="top"
            data-cy-audio-toggle
        />
    )
}
