import { ReactNode, useCallback, useMemo, useState } from 'react'
import { BackgroundSelectionPanel } from '../BackgroundSelectionPanel/BackgroundSelectionPanel'

export interface PanelHookState {
    panel: PANEL
    panelNode: ReactNode
    panelName: string
    isHidden: boolean
    showJoiningInfo: () => void
    showEChart: () => void
    showBackgroundSelection: () => void
    onClose: () => void
}

enum PANEL {
    JOINING_INFO,
    ECHART,
    BACKGROUND_SELECTION,
    NONE,
}

export const usePanel = (): PanelHookState => {
    const [panel, setPanel] = useState<PANEL>(PANEL.NONE)
    const [panelRef, setPanelRef] = useState<any>(null)

    const onClose = () => setPanel(PANEL.NONE)

    const setPanelHandler = useCallback(
        (_panel: PANEL) => {
            if (panel === _panel) {
                onClose()
            } else {
                setPanel(_panel)
            }
        },
        [panel]
    )

    const showJoiningInfo = () => setPanelHandler(PANEL.JOINING_INFO)
    const showEChart = () => setPanelHandler(PANEL.ECHART)
    const showBackgroundSelection = () =>
        setPanelHandler(PANEL.BACKGROUND_SELECTION)

    const isHidden = panel === PANEL.NONE

    const panelName = panelRef?.getName() ?? 'Settings'

    const panelNode = useMemo((): ReactNode => {
        switch (panel) {
            case PANEL.BACKGROUND_SELECTION:
                return (
                    <BackgroundSelectionPanel ref={ref => setPanelRef(ref)} />
                )

            default:
                return null
        }
    }, [panel])

    return {
        panel,
        isHidden,
        panelNode,
        panelName,
        showJoiningInfo,
        showEChart,
        showBackgroundSelection,
        onClose,
    }
}
