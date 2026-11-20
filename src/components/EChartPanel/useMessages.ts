import { useCallback, useState } from 'react'
import { ChatItem } from '../../services/models/Message.model'

export interface MessagesHookState {
    messages: ChatItem[]
    hasNewMessages: boolean
    addMessage(message: ChatItem): void
    setHasNewMessages(hasNewMessages: boolean): void
    reset(): void
}

export const useMessages = (): MessagesHookState => {
    const [messages, setMessages] = useState<ChatItem[]>([])
    const [hasNewMessages, setHasNewMessages] = useState<boolean>(false)

    // A reconnected stream can repeat an event: each line and offer is kept once, by id.
    const addMessage = useCallback((newMessage: ChatItem) => {
        setMessages(draft =>
            draft.some(
                item =>
                    item.id === newMessage.id &&
                    item.constructor === newMessage.constructor
            )
                ? draft
                : [...draft, newMessage]
        )
    }, [])

    const reset = useCallback(() => {
        setMessages([])
        setHasNewMessages(false)
    }, [])

    return { messages, hasNewMessages, addMessage, setHasNewMessages, reset }
}
