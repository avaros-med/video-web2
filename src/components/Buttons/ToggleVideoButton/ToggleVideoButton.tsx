import { useCallback, useRef } from 'react'

import useDevices from '../../../hooks/useDevices/useDevices'
import useLocalVideoToggle from '../../../hooks/useLocalVideoToggle/useLocalVideoToggle'
import { IconButton } from '../../UI/IconButton'

export default function ToggleVideoButton(props: {
    disabled?: boolean
    className?: string
}) {
    const [isVideoEnabled, toggleVideoEnabled] = useLocalVideoToggle()
    const lastClickTimeRef = useRef(0)
    const { hasVideoInputDevices } = useDevices()

    const toggleVideo = useCallback(() => {
        if (Date.now() - lastClickTimeRef.current > 500) {
            lastClickTimeRef.current = Date.now()
            toggleVideoEnabled()
        }
    }, [toggleVideoEnabled])

    return (
        <IconButton
            classes={props.className}
            intent={isVideoEnabled ? 'text' : 'danger'}
            icon={isVideoEnabled ? 'videocam' : 'videocam_off'}
            onClick={toggleVideo}
            disabled={!hasVideoInputDevices || props.disabled}
            tooltipContent={
                isVideoEnabled ? 'Turn off camera' : 'Turn on camera'
            }
            data-cy-video-toggle
        />
    )
}
