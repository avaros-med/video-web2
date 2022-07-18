import { createContext, useContext } from 'react'
import { PanelHookState, usePanel } from './usePanel'

interface ContextState {
    panel: PanelHookState
}

const initialState: ContextState = {
    panel: {} as any,
}

const LocalStateContext = createContext<ContextState>(initialState)

// Provider
export function PanelContextProvider({ children }: any) {
    const panelHookState = usePanel()

    return (
        <LocalStateContext.Provider
            value={{
                panel: panelHookState,
            }}
        >
            {children}
        </LocalStateContext.Provider>
    )
}

// Consumer
export function usePanelContext() {
    return useContext(LocalStateContext)
}
