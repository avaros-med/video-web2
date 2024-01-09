import moment from 'moment'
import { useCallback, useState } from 'react'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { videoService } from '../../../services/http/video.service'
import { useEChartContext } from '../../EChartPanel/useEChartContext'
import EndCallDialog, {
    EndCallDialogResponse,
} from '../../EndCallDialog/EndCallDialog'
import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

const MOMENT_DATETIME_FORMAT = 'MMM. Do, YYYY hh:mma' // Jan. 1st, 2000 5:30pm

export default function EndCallButton(props: { className?: string }) {
    const { room } = useVideoContext()
    const { currentUser, appointment } = useVideoContext()
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

            // Add log about video visit
            if (appointment) {
                const startAt = moment(
                    // @ts-ignore
                    window.sessionStartedAt || appointment?.startAt
                ).format(MOMENT_DATETIME_FORMAT)
                const endAt = moment().format(MOMENT_DATETIME_FORMAT)

                const eventId = appointment.roomID
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

                try {
                    await videoService.addLog(
                        appointment,
                        isDoctor,
                        eventId,
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
            currentUser,
            appointment,
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
