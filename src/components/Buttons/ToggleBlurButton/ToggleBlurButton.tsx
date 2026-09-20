import { isSupported } from '@twilio/video-processors'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'
import { IconButton } from '../../UI/IconButton'

export const BLUR_ON_TEXT = 'Turn off background blur'
export const BLUR_OFF_TEXT = 'Blur my background'

/*
 * One-tap background blur. Reuses the processor pipeline in useBackgroundSettings;
 * the choice persists per browser. Rendered only when the processor library
 * reports the browser can run it and the camera is on.
 */
export default function ToggleBlurButton(props: {
    className?: string
    disabled?: boolean
}) {
    const {
        backgroundSettings,
        setBackgroundSettings,
        localTracks,
    } = useVideoContext()
    const hasCameraTrack = localTracks.some(
        track => track.kind === 'video' && !track.name.includes('screen')
    )
    const isBlurOn = backgroundSettings?.type === 'blur'

    if (!isSupported) return null

    const toggleBlur = () => {
        diagnosticsService.log('device', 'background-blur', {
            enabled: !isBlurOn,
        })
        setBackgroundSettings({ type: isBlurOn ? 'none' : 'blur', index: 0 })
    }

    return (
        <IconButton
            classes={props.className}
            intent={isBlurOn ? 'primary-fade' : 'text'}
            icon={isBlurOn ? 'blur_on' : 'blur_off'}
            onClick={toggleBlur}
            disabled={!hasCameraTrack || props.disabled}
            tooltipContent={isBlurOn ? BLUR_ON_TEXT : BLUR_OFF_TEXT}
            tooltipPosition="top"
            data-cy-blur-toggle
        />
    )
}
