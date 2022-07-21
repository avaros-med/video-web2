import { useCallback, useState } from 'react'
import { Message } from '../../services/models/Message.model'

export interface MessagesHookState {
    messages: Message[]
    addMessage: (message: Message) => void
}

export const useMessages = (): MessagesHookState => {
    const [messages, setMessages] = useState<Message[]>([])

    const addMessage = useCallback((newMessage: Message) => {
        setMessages(draft => {
            return [...draft, newMessage]
        })
    }, [])

    return {
        messages,
        addMessage,
    }
}
