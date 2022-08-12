import { useCallback, useState } from 'react'
import { AttachmentMessage, Message } from '../../services/models/Message.model'

export interface MessagesHookState {
    messages: (Message | AttachmentMessage)[]
    hasNewMessages: boolean
    addMessage(message: Message | AttachmentMessage): void
    setHasNewMessages(hasNewMessages: boolean): void
}

export const useMessages = (): MessagesHookState => {
    const [messages, setMessages] = useState<(Message | AttachmentMessage)[]>(
        []
    )
    const [hasNewMessages, setHasNewMessages] = useState<boolean>(false)

    const addMessage = useCallback(
        (newMessage: Message | AttachmentMessage) => {
            setMessages(draft => {
                const hasMessage = draft?.find(i => i.ID === newMessage.ID)
                return !hasMessage ? [...draft, newMessage] : draft
            })
        },
        []
    )

    return {
        messages,
        hasNewMessages,
        addMessage,
        setHasNewMessages,
    }
}
