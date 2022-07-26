import { useCallback, useMemo } from 'react'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

export default function ToggleMessagesButton(props: { className?: string }) {
    const { isEChartPanelOpen, showEChart } = usePanelContext().panel
    const { hasNewMessages, setHasNewMessages } = useAvsSocketContext().messages

    const hasNotification = useMemo(() => {
        return !isEChartPanelOpen && hasNewMessages
    }, [isEChartPanelOpen, hasNewMessages])

    const onClickHandler = useCallback(() => {
        showEChart(false)
        if (isEChartPanelOpen) {
            setHasNewMessages(false)
        }
    }, [isEChartPanelOpen, showEChart, setHasNewMessages])

    return (
        <IconButton
            classes={props.className}
            intent="text"
            icon="chat"
            hasNotification={hasNotification}
            animateOnNotification={hasNotification}
            onClick={onClickHandler}
            tooltipContent="Messages"
            tooltipPosition="top"
        />
    )
}
