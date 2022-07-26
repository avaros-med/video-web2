import { useMemo } from 'react'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

export default function ToggleMessagesButton(props: { className?: string }) {
    const { isEChartPanelOpen, showEChart } = usePanelContext().panel
    const { hasNewMessages } = useAvsSocketContext().messages

    const hasNotification = useMemo(() => {
        return !isEChartPanelOpen && hasNewMessages
    }, [isEChartPanelOpen, hasNewMessages])

    return (
        <IconButton
            classes={props.className}
            intent="text"
            icon="chat"
            hasNotification={hasNotification}
            animateOnNotification={hasNotification}
            onClick={() => showEChart(false)}
            tooltipContent="Messages"
            tooltipPosition="top"
        />
    )
}
