import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

export default function ToggleMessagesButton(props: { className?: string }) {
    const { showEChart } = usePanelContext().panel

    return (
        <IconButton
            classes={props.className}
            intent="text"
            icon="chat"
            onClick={() => showEChart(false)}
            tooltipContent="Messages"
            tooltipPosition="top"
        />
    )
}
