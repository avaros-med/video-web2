import { createContext, useContext, useState } from 'react'
import { DemographicHookState, useDemographic } from './useDemographic'
import { HeaderTabsHookState, useHeaderTabs } from './useHeaderTabs'

interface ContextState {
    headerTabs: HeaderTabsHookState
    demographic: DemographicHookState
    note: {
        note: string
        setNote(note: string): void
    }
}

const LocalStateContext = createContext<ContextState>(null!)

// Provider
export function EChartContextProvider({ children }: any) {
    const headerTabsHookState = useHeaderTabs()
    const demographicHookState = useDemographic()
    const [note, setNote] = useState<string>('')

    return (
        <LocalStateContext.Provider
            value={{
                headerTabs: headerTabsHookState,
                demographic: demographicHookState,
                note: {
                    note,
                    setNote,
                },
            }}
        >
            {children}
        </LocalStateContext.Provider>
    )
}

// Consumer
export function useEChartContext() {
    return useContext(LocalStateContext)
}
