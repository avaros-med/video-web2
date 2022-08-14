import { useCallback } from 'react'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { useEChartContext } from '../../EChartPanel/useEChartContext'
import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

export default function EndCallButton(props: { className?: string }) {
    const { room } = useVideoContext()
    const { reset: resetMessages } = useAvsSocketContext().messages
    const {
        clearDemographic: resetDemographic,
    } = useEChartContext().demographic
    const { onClose: resetPanel } = usePanelContext().panel

    const onEndCall = useCallback(() => {
        room!.disconnect()
        resetMessages()
        resetDemographic()
        resetPanel()
    }, [room, resetMessages, resetDemographic, resetPanel])

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
