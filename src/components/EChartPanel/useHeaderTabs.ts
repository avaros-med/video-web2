import { useMemo, useState } from 'react'

export interface HeaderTabsHookState {
    tabs: HeaderTab[]
    tabSelected: HeaderTab
    setTabSelected: (tabSelected: HeaderTab) => void
    setEChartTab: () => void
    setMessagesTab: () => void
}

export enum HEADER_TAB {
    ECHART,
    MESSAGES,
}

export interface HeaderTab {
    value: HEADER_TAB
    display: string
    iconName: string
}

const allTabs: HeaderTab[] = [
    {
        value: HEADER_TAB.ECHART,
        display: 'eChart',
        iconName: 'assignment',
    },
    {
        value: HEADER_TAB.MESSAGES,
        display: 'Messages',
        iconName: 'chat',
    },
]

const defaultTab = allTabs[1]

export const useHeaderTabs = (): HeaderTabsHookState => {
    const tabs = useMemo((): HeaderTab[] => allTabs, [])
    const [tabSelected, setTabSelected] = useState<HeaderTab>(defaultTab)

    const eChartTab = useMemo(
        () => allTabs?.find(i => i.value === HEADER_TAB.ECHART),
        []
    )
    const messagesTab = useMemo(
        () => allTabs?.find(i => i.value === HEADER_TAB.MESSAGES),
        []
    )

    const setEChartTab = () => setTabSelected(eChartTab!)

    const setMessagesTab = () => setTabSelected(messagesTab!)

    return {
        tabs,
        tabSelected,
        setTabSelected,
        setEChartTab,
        setMessagesTab,
    }
}
