import moment from 'moment'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'
import { videoService } from '../../../services/http/video.service'
import { utilsService } from '../../../services/utils.service'
import { useEChartContext } from '../../EChartPanel/useEChartContext'
import EndCallDialog, {
    EndCallDialogResponse,
} from '../../EndCallDialog/EndCallDialog'
import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

const MOMENT_DATETIME_FORMAT = 'MMM. Do, YYYY hh:mma' // Jan. 1st, 2000 5:30pm

export default function EndCallButton(props: { className?: string }) {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const { room, currentUser, videoRoom } = useVideoContext()
    const { reset: resetMessages } = useAvsSocketContext().messages
    const {
        clearDemographic: resetDemographic,
    } = useEChartContext().demographic
    const [showEndCallDialog, setShowEndCallDialog] = useState<boolean>(false)
    const { onClose: resetPanel } = usePanelContext().panel

    const onEndCall = useCallback(
        async (endCallDialogResponse?: EndCallDialogResponse) => {
            const isDoctor = !!currentUser

            if (isDoctor && !endCallDialogResponse) {
                setShowEndCallDialog(true)
                return
            }

            // The visit log row (ehr fills in the clinic, the provider, the times and this
            // caller's address): when this person's call started, and what they said of it.
            if (URLRoomName && videoRoom) {
                const sessionStartedAt = utilsService.sessionStartedAt()
                const startAt = moment(
                    sessionStartedAt || videoRoom.startAt
                ).format(MOMENT_DATETIME_FORMAT)
                const endAt = moment().format(MOMENT_DATETIME_FORMAT)

                let eventDetails = `Start at: ${startAt}\nEnd at: ${endAt}`
                if (endCallDialogResponse) {
                    if (endCallDialogResponse.comments) {
                        eventDetails += `\nComments: ${endCallDialogResponse.comments}`
                    }
                    if (endCallDialogResponse.isInterrupted) {
                        eventDetails += `\nCall was interrupted`
                    }
                    if (endCallDialogResponse.isAbandoned) {
                        eventDetails += `\nCall was abandoned`
                    }
                }
                // Attach the client-side diagnostics timeline so support can see
                // reconnects, screen share and microphone problems for this visit.
                eventDetails += `\n\n${diagnosticsService.getSummary()}`

                try {
                    await videoService.logVisit(
                        URLRoomName,
                        sessionStartedAt,
                        eventDetails
                    )
                } catch (error) {
                    console.error(error)
                }
            }

            room!.disconnect()
            resetMessages()
            resetDemographic()
            resetPanel()
        },
        [
            room,
            URLRoomName,
            currentUser,
            videoRoom,
            resetMessages,
            resetDemographic,
            resetPanel,
        ]
    )

    return (
        <>
            <IconButton
                classes={props.className}
                intent={'endcall'}
                icon="call_end"
                onClick={() => onEndCall()}
                tooltipContent="End call"
                tooltipPosition="top"
                data-cy-disconnect
            />
            <EndCallDialog
                open={showEndCallDialog}
                onClose={() => setShowEndCallDialog(false)}
                onConfirmed={response => onEndCall(response)}
            />
        </>
    )
}
