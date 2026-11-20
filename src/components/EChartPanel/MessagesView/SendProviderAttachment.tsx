import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { videoService } from '../../../services/http/video.service'
import { utilsService } from '../../../services/utils.service'
import { ChartItem } from '../../../services/models/ChartItem.model'
import { displayName } from '../../../services/models/Message.model'
import Snackbar from '../../Snackbar/Snackbar'
import { IconButton } from '../../UI/IconButton'
import { PatientDocumentsDialog } from '../PatientDocumentsDialog/PatientDocumentsDialog'

interface Props {
    classes?: string
}

const Styles = styled.div``

/**
 * A chart document passed to the patient (ehr docs/schedule-video.md V15): this page
 * downloads the PDF from the EMR's own print path with the provider's EMR session, then
 * offers it in the room through ehr; the patient opens it once, after giving the chart's
 * date of birth. The visit log notes it.
 */
export const SendProviderAttachment = ({ classes }: Props) => {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const { room } = useVideoContext()
    const [showDialog, setShowDialog] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const onSend = useCallback(
        async (item: ChartItem) => {
            if (!URLRoomName || !room) {
                return
            }
            const senderName = room.localParticipant.identity
            try {
                const pdf = await videoService.downloadChartItem(item)
                await videoService.offerDocument(
                    URLRoomName,
                    pdf,
                    item,
                    senderName
                )
            } catch (sendError) {
                console.error('Could not send the document', sendError)
                setError('The document was not sent. Please try again.')
                return
            }
            setShowDialog(false)
            try {
                await videoService.logVisit(
                    URLRoomName,
                    utilsService.sessionStartedAt(),
                    `${displayName(senderName)} sent file: ${item.title}`
                )
            } catch (logError) {
                console.error(logError)
            }
        },
        [URLRoomName, room]
    )

    return (
        <>
            <Styles className={classes ?? ''}>
                <IconButton
                    intent="primary-fade"
                    icon="attachment"
                    onClick={() => setShowDialog(true)}
                />
            </Styles>

            <PatientDocumentsDialog
                open={showDialog}
                onSend={onSend}
                onClose={() => setShowDialog(false)}
            />
            <Snackbar
                open={!!error}
                handleClose={() => setError(null)}
                variant="error"
                headline="Document not sent"
                message={error ?? ''}
                autoHideDuration={4000}
            />
        </>
    )
}
