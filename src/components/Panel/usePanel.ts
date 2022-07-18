import { useCallback, useState } from 'react'

export interface PanelHookState {
    panel: PANEL
    isHidden: boolean
    showJoiningInfo: () => void
    showEChart: () => void
    onClose: () => void
}

enum PANEL {
    JOINING_INFO,
    ECHART,
    NONE,
}

export const usePanel = (): PanelHookState => {
    const [panel, setPanel] = useState<PANEL>(PANEL.NONE)

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

    const isHidden = panel === PANEL.NONE

    return {
        panel,
        isHidden,
        showJoiningInfo,
        showEChart,
        onClose,
    }
}
