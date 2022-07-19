import { createContext, useContext } from 'react'
import { DemographicHookState, useDemographic } from './useDemographic'
import { HeaderTabsHookState, useHeaderTabs } from './useHeaderTabs'

interface ContextState {
    headerTabs: HeaderTabsHookState
    demographic: DemographicHookState
}

const initialState: ContextState = {
    headerTabs: {} as any,
    demographic: {} as any,
}

const LocalStateContext = createContext<ContextState>(initialState)

// Provider
export function EChartContextProvider({ children }: any) {
    const headerTabsHookState = useHeaderTabs()
    const demographicHookState = useDemographic()

    return (
        <LocalStateContext.Provider
            value={{
                headerTabs: headerTabsHookState,
                demographic: demographicHookState,
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
