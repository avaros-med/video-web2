import { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import {
    AttachmentMessage,
    Message,
} from '../../../services/models/Message.model'
import { TextHintStyles } from '../../UI/styles/styles'
import { MessageItem } from './MessageItem'

interface Props {
    classes?: string
}

const Styles = styled.div`
    width: 100%;
    height: 100%;
    overflow-y: auto;
`

const EmptyStateStyles = styled.div`
    width: 100%;
    height: 100%;
    font-weight: 500;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    img {
        width: 210px;
        height: auto;
        display: block;
    }
`

export const MessagesList = ({ classes }: Props) => {
    const { room } = useVideoContext()
    const { messages } = useAvsSocketContext().messages
    const scrollContainerRef = useRef<any>(null)

    // On new message, scroll the scroll container to bottom
    useEffect(() => {
        setTimeout(() => {
            if (!scrollContainerRef?.current) {
                return
            }
            scrollContainerRef.current.scrollTop =
                scrollContainerRef.current.scrollHeight
        }, 10)
    }, [messages])

    return (
        <Styles className={classes ?? ''} ref={scrollContainerRef}>
            {messages?.length > 0 ? (
                <>
                    {messages.map(
                        (
                            message: Message | AttachmentMessage,
                            index: number
                        ) => (
                            <MessageItem
                                key={index}
                                message={message}
                                isLocalRecipient={
                                    room?.localParticipant.identity ===
                                    message.senderName
                                }
                            />
                        )
                    )}
                </>
            ) : (
                <EmptyStateStyles>
                    <img
                        src={`${process.env.PUBLIC_URL}/assets/images/illustration-chat.svg`}
                        alt="Chat"
                    />
                    <TextHintStyles className="text-center mt-3">
                        Start a conversation with participants
                    </TextHintStyles>
                </EmptyStateStyles>
            )}
        </Styles>
    )
}
