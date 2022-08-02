import { useCallback, useState } from 'react'
import { Message } from '../../services/models/Message.model'

export interface MessagesHookState {
    messages: Message[]
    hasNewMessages: boolean
    addMessage(message: Message): void
    setHasNewMessages(hasNewMessages: boolean): void
}

export const useMessages = (): MessagesHookState => {
    const [messages, setMessages] = useState<Message[]>([])
    const [hasNewMessages, setHasNewMessages] = useState<boolean>(false)

    const addMessage = useCallback((newMessage: Message) => {
        setMessages(draft => {
            const hasMessage = draft?.find(i => i.ID === newMessage.ID)
            return !hasMessage ? [...draft, newMessage] : draft
        })
    }, [])

    return {
        messages,
        hasNewMessages,
        addMessage,
        setHasNewMessages,
    }
}
