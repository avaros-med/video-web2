import { useCallback, useMemo } from 'react'
import { videoService } from '../services/http/video.service'
import { Appointment } from '../services/models/Appointment.model'
import { useHttp } from './useHttp'

interface HttpAppointmentHookState {
    appointment: Appointment | null
    isLoading: boolean
    errorData: any
    getAppointmentByRoomName(roomName: string): Promise<Appointment>
}

export const useHttpAppointment = (): HttpAppointmentHookState => {
    const { sendRequest, isLoading, responseData, errorData } = useHttp()

    const appointment = useMemo(() => responseData ?? null, [responseData])

    const getAppointmentByRoomName = useCallback(
        (roomName: string) => {
            return sendRequest(
                videoService.getAppointmentByRoomName.bind({}, roomName)
            )
        },
        [sendRequest]
    )

    return {
        appointment,
        isLoading,
        errorData,
        getAppointmentByRoomName,
    }
}
