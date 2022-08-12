import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { Demographic } from '../../../services/models/Demographic.model'
import { DemographicDocument } from '../../../services/models/DemographicDocument.model'
import { SendAttachmentRequest } from '../../../services/ws/eventout'
import { socketService } from '../../../services/ws/socket.service'
import { IconButton } from '../../UI/IconButton'
import { PatientDocumentsDialog } from '../PatientDocumentsDialog/PatientDocumentsDialog'
import { useEChartContext } from '../useEChartContext'

interface Props {
    classes?: string
}

const Styles = styled.div``

export const SendProviderAttachment = ({ classes }: Props) => {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const { room } = useVideoContext()
    const [showDialog, setShowDialog] = useState<boolean>(false)
    const { demographic } = useEChartContext().demographic

    const senderName = room!.localParticipant.identity

    const demographicName = useMemo(
        (): string => (demographic ? Demographic.getFullName(demographic) : ''),
        [demographic]
    )

    const onSend = useCallback(
        (demographicDocument: DemographicDocument) => {
            const eventout: SendAttachmentRequest = {
                ID: +demographicDocument.id,
                name: demographicDocument.title,
                type: demographicDocument.type,
                demographicName,
                roomName: URLRoomName!,
                senderName,
            }
            socketService.dispatchEvent('SendAttachmentRequest', eventout)

            setShowDialog(false)
        },
        [URLRoomName, senderName, demographicName]
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
        </>
    )
}
