import { Grid } from '@material-ui/core'
import moment from 'moment'
import styled, { css } from 'styled-components'
import Colors from '../../../colors'
import { Message } from '../../../services/models/Message.model'

interface Props {
    message: Message
    isLocalRecipient: boolean
}

const Styles = styled.div`
    margin-bottom: 24px;
    font-size: 13px;
    display: flex;
    align-items: flex-start;
    flex-direction: column;

    ${props =>
        props.theme.isLocalRecipient
            ? css`
                  align-items: flex-end;
              `
            : css``}
`

const SenderNameStyles = styled.div`
    font-weight: 500;
`

const CreatedAtStyles = styled.div`
    color: ${Colors.TEXT_SECONDARY};
`

const MessageStyles = styled.div`
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 500;

    ${props =>
        props.theme.isLocalRecipient
            ? css`
                  background: ${Colors.BLUE}1C;
                  border-top-right-radius: 0;
              `
            : css`
                  background: ${Colors.CONTENT_BACKGROUND};
                  border-top-left-radius: 0;
              `}
`

export const MessageItem = ({ message, isLocalRecipient }: Props) => {
    return (
        <Styles theme={{ isLocalRecipient }}>
            <Grid
                container
                alignItems="center"
                justifyContent={isLocalRecipient ? 'flex-end' : 'flex-start'}
                className="mb-1"
            >
                <SenderNameStyles className="mr-2">
                    {message.senderName}
                </SenderNameStyles>
                <CreatedAtStyles>
                    {moment(message.createdAt).format('h:mm A')}
                </CreatedAtStyles>
            </Grid>
            <MessageStyles theme={{ isLocalRecipient }}>
                {message.message}
            </MessageStyles>
        </Styles>
    )
}
