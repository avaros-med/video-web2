import axios, { AxiosError, AxiosResponse } from 'axios'
import { Appointment } from '../models/Appointment.model'

const BASE_URL = process.env.REACT_APP_VIDEO_BASE_URL

const getAppointmentByRoomName = (roomName: string): Promise<Appointment> => {
    const url = `${BASE_URL}/video-appointment-by-room/${roomName}`

    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((response: AxiosResponse) => {
                if (response?.data) {
                    resolve(Appointment.deserialize(response.data))
                } else {
                    reject('Unable to get appointment')
                }
            })
            .catch((error: AxiosError) => reject(error))
    })
}

const validateRoomExists = (roomName: string): Promise<boolean> => {
    const url = `${BASE_URL}/room-exists/${roomName}`

    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((response: AxiosResponse) => {
                if (response?.data) {
                    resolve(response.data.roomExists)
                } else {
                    reject('Unable to validate room exists')
                }
            })
            .catch((error: AxiosError) => reject(error))
    })
}

const removeParticipant = (
    roomName: string,
    participantId: string
): Promise<boolean> => {
    const url = `${BASE_URL}/rooms/${roomName}/participants/${participantId}/disconnect`
    return axios.post(url)
}

export const videoService = {
    getAppointmentByRoomName,
    validateRoomExists,
    removeParticipant,
}
