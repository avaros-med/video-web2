import { ReactNode, useCallback, useMemo, useState } from 'react'
import { BackgroundSelectionPanel } from '../BackgroundSelectionPanel/BackgroundSelectionPanel'
import { EChartPanel } from '../EChartPanel/EChartPanel'
import { JoiningInfoPanel } from '../JoiningInfoPanel/JoiningInfoPanel'
import { MediaDevicesPanel } from '../MediaDevicesPanel/MediaDevicesPanel'

export interface PanelHookState {
    panel: PANEL
    panelNode: ReactNode
    panelName: string
    isHidden: boolean
    showJoiningInfo: () => void
    showEChart: () => void
    showMediaDevices: () => void
    showBackgroundSelection: () => void
    onClose: () => void
}

enum PANEL {
    JOINING_INFO,
    ECHART,
    MEDIA_DEVICES,
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
    const showMediaDevices = () => setPanelHandler(PANEL.MEDIA_DEVICES)

    const isHidden = panel === PANEL.NONE

    const panelName = useMemo((): string => panelRef?.getName() ?? 'Settings', [
        panelRef,
    ])

    const panelNode = useMemo((): ReactNode => {
        const props = {
            ref: (ref: any) => setPanelRef(ref),
        }

        switch (panel) {
            case PANEL.JOINING_INFO:
                return <JoiningInfoPanel {...props} />

            case PANEL.ECHART:
                return <EChartPanel {...props} />

            case PANEL.MEDIA_DEVICES:
                return <MediaDevicesPanel {...props} />

            case PANEL.BACKGROUND_SELECTION:
                return <BackgroundSelectionPanel {...props} />

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
        showMediaDevices,
        showBackgroundSelection,
        onClose,
    }
}
