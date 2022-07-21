import { createContext, useCallback, useContext, useState } from 'react'
import {
    MessagesHookState,
    useMessages,
} from '../../components/EChartPanel/useMessages'
import { Message } from '../../services/models/Message.model'
import { BaseEvent } from '../../services/ws/socket.service'

interface ContextState {
    messages: MessagesHookState
    networkError: {
        hasNetworkError: boolean
        onNetworkError: () => void
    }
    socketEventHandler: (event: BaseEvent) => void
}

const initialState: ContextState = {
    messages: {} as any,
    networkError: {} as any,
    socketEventHandler: {} as any,
}

const LocalStateContext = createContext<ContextState>(initialState)

// Provider
export function AvsSocketContextProvider({ children }: any) {
    const { messages, addMessage } = useMessages()
    const [hasNetworkError, setHasNetworkError] = useState<boolean>(false)

    const socketEventHandler = useCallback(
        (event: BaseEvent) => {
            switch (event.type) {
                case 'Message': {
                    const newMessage = Message.deserialize(event.payload)
                    addMessage(newMessage)
                }
            }
        },
        [addMessage]
    )

    const onNetworkError = useCallback(() => {
        setHasNetworkError(true)
    }, [])

    return (
        <LocalStateContext.Provider
            value={{
                messages: { messages, addMessage },
                networkError: { hasNetworkError, onNetworkError },
                socketEventHandler,
            }}
        >
            {children}
        </LocalStateContext.Provider>
    )
}

// Consumer
export function useAvsSocketContext() {
    return useContext(LocalStateContext)
}
