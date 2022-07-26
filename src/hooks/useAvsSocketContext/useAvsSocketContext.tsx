import { createContext, useCallback, useContext, useState } from 'react'
import {
    MessagesHookState,
    useMessages,
} from '../../components/EChartPanel/useMessages'
import { Message } from '../../services/models/Message.model'
import { BaseEvent } from '../../services/ws/socket.service'
import useVideoContext from '../useVideoContext/useVideoContext'

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
    const { room } = useVideoContext()
    const {
        messages,
        hasNewMessages,
        addMessage,
        setHasNewMessages,
    } = useMessages()
    const [hasNetworkError, setHasNetworkError] = useState<boolean>(false)

    const socketEventHandler = useCallback(
        (event: BaseEvent) => {
            switch (event.type) {
                case 'Message': {
                    const newMessage = Message.deserialize(event.payload)
                    addMessage(newMessage)

                    // Set new-messages flag if new message is not from the local participant
                    if (
                        newMessage.senderName !==
                        room?.localParticipant?.identity
                    ) {
                        setHasNewMessages(true)
                    }
                }
            }
        },
        [room, addMessage, setHasNewMessages]
    )

    const onNetworkError = useCallback(() => {
        setHasNetworkError(true)
    }, [])

    return (
        <LocalStateContext.Provider
            value={{
                messages: {
                    messages,
                    hasNewMessages,
                    addMessage,
                    setHasNewMessages,
                },
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
