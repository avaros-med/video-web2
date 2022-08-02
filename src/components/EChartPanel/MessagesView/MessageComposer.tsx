import { Grid } from '@material-ui/core'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import Colors from '../../../colors'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { utilsService } from '../../../services/utils.service'
import { SendMessage } from '../../../services/ws/eventout'
import { socketService } from '../../../services/ws/socket.service'
import { Button } from '../../UI/Button'
import { Input } from '../../UI/Input'
import { SendPatientAttachment } from './SendPatientAttachment'
import { SendProviderAttachment } from './SendProviderAttachment'

const Styles = styled.div`
    width: 100%;

    input {
        width: 100%;
        padding: 12px 16px;
        background: ${Colors.CONTENT_BACKGROUND};
        border: 0;
        border-radius: 5px;
    }

    .flex-1 {
        flex: 1;
    }
`

export const MessageComposer = () => {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const { room, currentUser } = useVideoContext()
    const [message, setMessage] = useState<string>('')

    const senderName = room!.localParticipant.identity

    const onSendMessage = useCallback(() => {
        if (!URLRoomName || !message?.trim().length) {
            return
        }

        const eventout: SendMessage = {
            ID: utilsService.getRandomNumber(100000, 999999),
            description: message.trim(),
            fromProvider: true,
            roomName: URLRoomName,
            senderName,
            createdAt: new Date().toISOString(),
        }
        socketService.dispatchEvent('Message', eventout)
        setMessage('')
    }, [URLRoomName, message, senderName])

    return (
        <Styles>
            <Grid container alignItems="center">
                <Input
                    classes="flex-1"
                    placeholder="Type a message ..."
                    value={message}
                    onChange={setMessage}
                    onKeyPress={event => {
                        if (event.key === 'Enter') {
                            onSendMessage()
                        }
                    }}
                />
                <Button
                    classes="ml-3"
                    intent="primary-fade"
                    label="Send"
                    onClick={onSendMessage}
                />
                {currentUser ? (
                    <SendProviderAttachment classes="ml-3" />
                ) : (
                    <SendPatientAttachment classes="ml-3" />
                )}
            </Grid>
        </Styles>
    )
}
