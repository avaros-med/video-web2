import { useMemo, useState } from 'react'

export interface HeaderTabsHookState {
    tabs: HeaderTab[]
    tabSelected: HeaderTab
    setTabSelected: (tabSelected: HeaderTab) => void
}

export enum HEADER_TAB {
    DOCUMENTS,
    EFORMS,
    FORMS,
}

export interface HeaderTab {
    value: HEADER_TAB
    display: string
}

const allTabs: HeaderTab[] = [
    {
        value: HEADER_TAB.DOCUMENTS,
        display: 'Documents',
    },
    {
        value: HEADER_TAB.EFORMS,
        display: 'eForms',
    },
    {
        value: HEADER_TAB.FORMS,
        display: 'Forms',
    },
]

export const defaultTab = allTabs[0]

export const useHeaderTabs = (
    initialTabSelected: HeaderTab
): HeaderTabsHookState => {
    const tabs = useMemo((): HeaderTab[] => allTabs, [])
    const [tabSelected, setTabSelected] = useState<HeaderTab>(
        initialTabSelected
    )

    return {
        tabs,
        tabSelected,
        setTabSelected,
    }
}
