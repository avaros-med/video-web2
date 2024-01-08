import { useCallback } from 'react'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { videoService } from '../../../services/http/video.service'
import { useEChartContext } from '../../EChartPanel/useEChartContext'
import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

export default function EndCallButton(props: { className?: string }) {
    const { room } = useVideoContext()
    const { currentUser, appointment } = useVideoContext()
    const { reset: resetMessages } = useAvsSocketContext().messages
    const {
        clearDemographic: resetDemographic,
    } = useEChartContext().demographic
    const { onClose: resetPanel } = usePanelContext().panel

    const onEndCall = useCallback(async () => {
        // Add log about video visit
        if (appointment) {
            try {
                const isDoctor = !!currentUser
                await videoService.addLog(appointment, isDoctor)
            } catch (error) {
                console.error(error)
            }
        }

        room!.disconnect()
        resetMessages()
        resetDemographic()
        resetPanel()
    }, [
        room,
        currentUser,
        appointment,
        resetMessages,
        resetDemographic,
        resetPanel,
    ])

    return (
        <IconButton
            classes={props.className}
            intent={'endcall'}
            icon="call_end"
            onClick={onEndCall}
            tooltipContent="End call"
            tooltipPosition="top"
            data-cy-disconnect
        />
    )
}
