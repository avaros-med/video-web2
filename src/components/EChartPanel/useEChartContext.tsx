import { createContext, useContext } from 'react'
import { HeaderTabsHookState, useHeaderTabs } from './useHeaderTabs'

interface ContextState {
    headerTabs: HeaderTabsHookState
}

const initialState: ContextState = {
    headerTabs: {} as any,
}

const LocalStateContext = createContext<ContextState>(initialState)

// Provider
export function EChartContextProvider({ children }: any) {
    const headerTabsHookState = useHeaderTabs()

    return (
        <LocalStateContext.Provider
            value={{
                headerTabs: headerTabsHookState,
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
