import { Grid } from '@material-ui/core'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import Colors from '../../../colors'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { videoService } from '../../../services/http/video.service'
import Snackbar from '../../Snackbar/Snackbar'
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
    const [isSending, setIsSending] = useState<boolean>(false)
    const [hasError, setHasError] = useState<boolean>(false)

    // This person's identity in the room: the line comes back on the stream under it.
    const senderName = room!.localParticipant.identity

    const onSendMessage = useCallback(() => {
        const text = message.trim()
        if (!URLRoomName || !text.length || isSending) {
            return
        }

        setIsSending(true)
        videoService
            .sendMessage(URLRoomName, text, senderName)
            .then(() => setMessage(''))
            .catch(error => {
                console.error('Could not send the message', error)
                setHasError(true)
            })
            .finally(() => setIsSending(false))
    }, [URLRoomName, message, senderName, isSending])

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
                    isLoading={isSending}
                    onClick={onSendMessage}
                />
                {currentUser ? (
                    <SendProviderAttachment classes="ml-3" />
                ) : (
                    <SendPatientAttachment classes="ml-3" />
                )}
            </Grid>
            <Snackbar
                open={hasError}
                handleClose={() => setHasError(false)}
                variant="error"
                headline="Your message was not sent"
                message="Please try again."
                autoHideDuration={4000}
            />
        </Styles>
    )
}
