import { Grid } from '@material-ui/core'
import moment from 'moment'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import Colors from '../../../colors'
import { isNotFound, videoService } from '../../../services/http/video.service'
import {
    ChatItem,
    displayName,
    FileOffer,
    Message,
} from '../../../services/models/Message.model'
import { utilsService } from '../../../services/utils.service'
import { Button } from '../../UI/Button'
import { PatientAuthenticationDialog } from './PatientAuthenticationDialog'

interface Props {
    message: ChatItem
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

    .word-break-all {
        word-break: break-all;
    }

    .color-hint {
        color: ${Colors.TEXT_SECONDARY};
        white-space: nowrap;
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
                    {displayName(message.senderName)}
                </SenderNameStyles>
                <CreatedAtStyles>
                    {moment(message.createdAt).format('h:mm A')}
                </CreatedAtStyles>
            </Grid>
            {message instanceof Message && (
                <MessageStyles theme={{ isLocalRecipient }}>
                    {message.message}
                </MessageStyles>
            )}
            {message instanceof FileOffer && (
                <FileOfferContent
                    offer={message}
                    isLocalRecipient={isLocalRecipient}
                />
            )}
        </Styles>
    )
}

type OfferState = 'offered' | 'downloading' | 'taken' | 'gone' | 'failed'

/**
 * A file offered in the room. The sender sees it as sent. Anyone else downloads it once
 * (ehr hands each file out once, within 10 minutes); a chart document asks for the
 * patient's date of birth first.
 */
const FileOfferContent = ({
    offer,
    isLocalRecipient,
}: {
    offer: FileOffer
    isLocalRecipient: boolean
}) => {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const [state, setState] = useState<OfferState>('offered')
    const [showAuthenticationDialog, setShowAuthenticationDialog] = useState<
        boolean
    >(false)

    const onDownload = useCallback(() => {
        if (!URLRoomName) {
            return
        }
        setState('downloading')
        videoService
            .downloadFile(URLRoomName, offer.id)
            .then(blob => {
                utilsService.saveBlob(blob, offer.name)
                setState('taken')
            })
            .catch(error => setState(isNotFound(error) ? 'gone' : 'failed'))
    }, [URLRoomName, offer.id, offer.name])

    let action = null
    if (isLocalRecipient) {
        action = <span className="color-hint ml-5">Sent</span>
    } else if (state === 'taken') {
        action = <span className="color-hint ml-5">Downloaded</span>
    } else if (state === 'gone') {
        action = <span className="color-hint ml-5">No longer available</span>
    } else {
        action = (
            <Button
                classes="d-inline-flex p-0 ml-5"
                intent="text-primary"
                label={
                    offer.isDocument
                        ? 'Open'
                        : state === 'failed'
                        ? 'Try again'
                        : 'Download'
                }
                isLoading={state === 'downloading'}
                onClick={() =>
                    offer.isDocument
                        ? setShowAuthenticationDialog(true)
                        : onDownload()
                }
            />
        )
    }

    return (
        <MessageStyles theme={{ isLocalRecipient }}>
            <Grid
                className="d-flex"
                alignItems="center"
                justifyContent="space-between"
            >
                <Grid container alignItems="center">
                    <i className="material-icons color-blue mr-3">attachment</i>
                    <span className="word-break-all">{offer.name}</span>
                </Grid>
                {action}
            </Grid>

            {offer.isDocument && !isLocalRecipient && (
                <PatientAuthenticationDialog
                    open={showAuthenticationDialog}
                    offer={offer}
                    onOpened={() => setState('taken')}
                    onGone={() => setState('gone')}
                    onClose={() => setShowAuthenticationDialog(false)}
                />
            )}
        </MessageStyles>
    )
}
