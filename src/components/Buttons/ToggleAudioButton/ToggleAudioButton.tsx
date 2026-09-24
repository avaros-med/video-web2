import useLocalAudioToggle from '../../../hooks/useLocalAudioToggle/useLocalAudioToggle'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { IconButton } from '../../UI/IconButton'

export const MIC_ALERT_TOOLTIP = 'Microphone problem, see the message above'
export const MIC_ALERT_HIDDEN_TOOLTIP = 'Microphone problem, click for details'

export default function ToggleAudioButton(props: {
    disabled?: boolean
    className?: string
}) {
    const [isAudioEnabled, toggleAudioEnabled] = useLocalAudioToggle()
    const { localTracks, audioHealth } = useVideoContext()
    const hasAudioTrack = localTracks.some(track => track.kind === 'audio')

    // The microphone is not reaching the call: the button turns red and pulses
    // while MediaHealthNotifications explains what to do just above it. If that
    // callout has been dismissed, clicking the button brings it back rather than
    // toggling mute, because the callout carries the only way to reconnect.
    const hasMicAlert = Boolean(audioHealth && audioHealth.micStatus !== 'ok')
    const isCalloutHidden = hasMicAlert && !audioHealth.isMicAlertVisible

    let intent: 'text' | 'danger' | 'alert' = isAudioEnabled ? 'text' : 'danger'
    if (hasMicAlert) intent = 'alert'

    let tooltip = isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'
    if (hasMicAlert) {
        tooltip = isCalloutHidden ? MIC_ALERT_HIDDEN_TOOLTIP : MIC_ALERT_TOOLTIP
    }

    return (
        <IconButton
            classes={props.className}
            intent={intent}
            icon={isAudioEnabled && !hasMicAlert ? 'mic' : 'mic_off'}
            onClick={
                isCalloutHidden ? audioHealth.showMicAlert : toggleAudioEnabled
            }
            disabled={!hasAudioTrack || props.disabled}
            tooltipContent={tooltip}
            tooltipPosition="top"
            data-cy-audio-toggle
        />
    )
}
