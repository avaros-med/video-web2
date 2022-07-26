import { ReactNode, useCallback, useMemo, useState } from 'react'
import { useAvsSocketContext } from '../../hooks/useAvsSocketContext/useAvsSocketContext'
import { BackgroundSelectionPanel } from '../BackgroundSelectionPanel/BackgroundSelectionPanel'
import { EChartPanel } from '../EChartPanel/EChartPanel'
import { JoiningInfoPanel } from '../JoiningInfoPanel/JoiningInfoPanel'
import { MediaDevicesPanel } from '../MediaDevicesPanel/MediaDevicesPanel'

export interface PanelHookState {
    panel: PANEL
    panelNode: ReactNode
    panelName: ReactNode | string
    isHidden: boolean
    isEChartPanelOpen: boolean
    showJoiningInfo: () => void
    showEChart: (showEChartTab: boolean) => void
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
    const { setHasNewMessages } = useAvsSocketContext().messages
    const [panel, setPanel] = useState<PANEL>(PANEL.NONE)
    const [panelRef, setPanelRef] = useState<any>(null)
    const [showEChartTab, setShowEChartTab] = useState<boolean>(false)

    const onClose = useCallback(() => {
        setPanel(PANEL.NONE)

        // If closing echart panel, then set new-messages flag to false
        if (panel === PANEL.ECHART) {
            setHasNewMessages(false)
        }
    }, [panel, setHasNewMessages])

    const setPanelHandler = useCallback(
        (_panel: PANEL) => {
            if (panel === _panel) {
                onClose()
            } else {
                setPanel(_panel)
            }
        },
        [panel, onClose]
    )

    const showJoiningInfo = () => setPanelHandler(PANEL.JOINING_INFO)
    const showEChart = (_showEChartTab: boolean) => {
        setShowEChartTab(_showEChartTab)
        setPanelHandler(PANEL.ECHART)
    }
    const showBackgroundSelection = () =>
        setPanelHandler(PANEL.BACKGROUND_SELECTION)
    const showMediaDevices = () => setPanelHandler(PANEL.MEDIA_DEVICES)

    const isHidden = panel === PANEL.NONE

    const panelName = useMemo(
        (): string =>
            panelRef?.getHeaderNode
                ? panelRef?.getHeaderNode()
                : panelRef?.getName() ?? 'Settings',
        [panelRef]
    )

    const panelNode = useMemo((): ReactNode => {
        const props = {
            ref: (ref: any) => setPanelRef(ref),
        }

        switch (panel) {
            case PANEL.JOINING_INFO:
                return <JoiningInfoPanel {...props} />

            case PANEL.ECHART:
                return <EChartPanel {...props} showEChartTab={showEChartTab} />

            case PANEL.MEDIA_DEVICES:
                return <MediaDevicesPanel {...props} />

            case PANEL.BACKGROUND_SELECTION:
                return <BackgroundSelectionPanel {...props} />

            default:
                return null
        }
    }, [panel, showEChartTab])

    const isEChartPanelOpen = useMemo(() => panel === PANEL.ECHART, [panel])

    return {
        panel,
        isHidden,
        panelNode,
        panelName,
        isEChartPanelOpen,
        showJoiningInfo,
        showEChart,
        showMediaDevices,
        showBackgroundSelection,
        onClose,
    }
}
