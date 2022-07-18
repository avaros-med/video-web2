import useScreenShareParticipant from '../../../hooks/useScreenShareParticipant/useScreenShareParticipant'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { IconButton } from '../../UI/IconButton'

export const SCREEN_SHARE_TEXT = 'Share Screen'
export const STOP_SCREEN_SHARE_TEXT = 'Stop Sharing Screen'
export const SHARE_IN_PROGRESS_TEXT =
    'Cannot share screen when another user is sharing'
export const SHARE_NOT_SUPPORTED_TEXT =
    'Screen sharing is not supported with this browser'

export default function ToggleScreenShareButton(props: {
    className?: string
    disabled?: boolean
}) {
    const screenShareParticipant = useScreenShareParticipant()
    const { toggleScreenShare } = useVideoContext()
    const disableScreenShareButton = Boolean(screenShareParticipant)
    const isScreenShareSupported =
        navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia
    const isDisabled =
        props.disabled || disableScreenShareButton || !isScreenShareSupported

    let tooltipMessage = ''

    if (disableScreenShareButton) {
        tooltipMessage = SHARE_IN_PROGRESS_TEXT
    }

    if (!isScreenShareSupported) {
        tooltipMessage = SHARE_NOT_SUPPORTED_TEXT
    }

    return (
        <IconButton
            classes={props.className ?? ''}
            intent="text"
            icon="screen_share"
            onClick={toggleScreenShare}
            disabled={isDisabled}
            tooltipContent={tooltipMessage || SCREEN_SHARE_TEXT}
            data-cy-share-screen
        />
    )
}
