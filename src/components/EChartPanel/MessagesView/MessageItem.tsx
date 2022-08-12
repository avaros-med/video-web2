import { Grid } from '@material-ui/core'
import moment from 'moment'
import { useCallback, useMemo, useState } from 'react'
import styled, { css } from 'styled-components'
import Colors from '../../../colors'
import {
    AttachmentMessage,
    Message,
} from '../../../services/models/Message.model'
import { utilsService } from '../../../services/utils.service'
import { Button } from '../../UI/Button'
import { useHttpDemographic } from '../EChartView/useHttpDemographic'
import { useEChartContext } from '../useEChartContext'
import { PatientAuthenticationDialog } from './PatientAuthenticationDialog'

interface Props {
    message: Message | AttachmentMessage
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

    .color-blue {
        color: ${Colors.BLUE};
    }
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
            {message instanceof Message && (
                <MessageContent
                    message={message}
                    isLocalRecipient={isLocalRecipient}
                />
            )}
            {message instanceof AttachmentMessage && (
                <AttachmentMessageContent
                    message={message}
                    isLocalRecipient={isLocalRecipient}
                />
            )}
        </Styles>
    )
}

const MessageContent = ({
    message,
    isLocalRecipient,
}: {
    message: Message
    isLocalRecipient: boolean
}) => {
    return (
        <MessageStyles theme={{ isLocalRecipient }}>
            {message.message}
        </MessageStyles>
    )
}

const AttachmentMessageContent = ({
    message,
    isLocalRecipient,
}: {
    message: AttachmentMessage
    isLocalRecipient: boolean
}) => {
    const { demographic } = useEChartContext().demographic
    const { isLoading, getDocumentUrl } = useHttpDemographic()
    const [showAuthenticationDialog, setShowAuthenticationDialog] = useState<
        boolean
    >(false)

    const isAuthenticated = useMemo(() => !!isLocalRecipient, [
        isLocalRecipient,
    ])

    const onView = useCallback(() => {
        if (!demographic) {
            return
        }

        getDocumentUrl(
            demographic.demographicNo,
            message.demographicDocumentID,
            message.documentName,
            message.documentType
        ).then((url: string) => {
            utilsService.downloadByUrl(url, message.documentName)
        })
    }, [
        demographic,
        message.demographicDocumentID,
        message.documentName,
        message.documentType,
        getDocumentUrl,
    ])

    return (
        <MessageStyles theme={{ isLocalRecipient }}>
            <Grid
                className="d-flex"
                alignItems="center"
                justifyContent="space-between"
            >
                <Grid container alignItems="center">
                    <i className="material-icons color-blue mr-3">attachment</i>
                    <span>{message.documentName}</span>
                </Grid>
                <Button
                    classes="d-inline-flex p-0 ml-5"
                    intent="text-primary"
                    label={isAuthenticated ? 'View' : 'Accept'}
                    isLoading={isLoading}
                    onClick={() =>
                        isAuthenticated
                            ? onView()
                            : setShowAuthenticationDialog(true)
                    }
                />
            </Grid>

            <PatientAuthenticationDialog
                open={showAuthenticationDialog}
                documentId={message.demographicDocumentID}
                documentName={message.documentName}
                documentType={message.documentType}
                demographicName={message.demographicName}
                verifierName={message.senderName}
                onClose={() => setShowAuthenticationDialog(false)}
            />
        </MessageStyles>
    )
}
