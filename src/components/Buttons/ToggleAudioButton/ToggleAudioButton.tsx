import useLocalAudioToggle from '../../../hooks/useLocalAudioToggle/useLocalAudioToggle'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { IconButton } from '../../UI/IconButton'

export default function ToggleAudioButton(props: {
    disabled?: boolean
    className?: string
}) {
    const [isAudioEnabled, toggleAudioEnabled] = useLocalAudioToggle()
    const { localTracks } = useVideoContext()
    const hasAudioTrack = localTracks.some(track => track.kind === 'audio')

    return (
        <IconButton
            classes={props.className}
            intent={isAudioEnabled ? 'text' : 'danger'}
            icon={isAudioEnabled ? 'mic' : 'mic_off'}
            onClick={toggleAudioEnabled}
            disabled={!hasAudioTrack || props.disabled}
            tooltipContent={
                isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'
            }
            data-cy-audio-toggle
        />
    )
}
