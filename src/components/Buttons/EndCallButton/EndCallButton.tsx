import { useCallback } from 'react'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { LogPayload, videoService } from '../../../services/http/video.service'
import { utilsService } from '../../../services/utils.service'
import { useEChartContext } from '../../EChartPanel/useEChartContext'
import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

export default function EndCallButton(props: { className?: string }) {
    const { room } = useVideoContext()
    const { currentUser, appointment } = useVideoContext()
    const { reset: resetMessages } = useAvsSocketContext().messages
    const {
        clearDemographic: resetDemographic,
    } = useEChartContext().demographic
    const { onClose: resetPanel } = usePanelContext().panel

    const onEndCall = useCallback(async () => {
        // Add log about video visit
        if (appointment) {
            try {
                const isDoctor = !!currentUser
                const ip = await utilsService.getIp()
                // @ts-ignore
                const startAt = window.sessionStartedAt || appointment?.startAt
                const endAt = new Date()

                const payload: LogPayload = {
                    clientName: appointment.clientName,
                    organizationID: appointment.clientName,
                    startAt: startAt.toISOString(),
                    endAt: endAt.toISOString(),
                    clinicalUserInformation: appointment.details.providerName,
                    clinicalUserLocation: isDoctor ? ip : null,
                    participantLocation: isDoctor ? null : ip,
                    providerID: appointment.providerID,
                    physicianFlag: isDoctor ? 'Doctor' : 'Other',
                }
                await videoService.addLog(payload)
            } catch (error) {
                console.error(error)
            }
        }

        room!.disconnect()
        resetMessages()
        resetDemographic()
        resetPanel()
    }, [
        room,
        currentUser,
        appointment,
        resetMessages,
        resetDemographic,
        resetPanel,
    ])

    return (
        <IconButton
            classes={props.className}
            intent={'endcall'}
            icon="call_end"
            onClick={onEndCall}
            tooltipContent="End call"
            tooltipPosition="top"
            data-cy-disconnect
        />
    )
}
