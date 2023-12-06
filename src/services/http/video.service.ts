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

const validateRoomExists = (
    roomName: string
): Promise<ValidateRoomResponse> => {
    const url = `${BASE_URL}/room-exists/${roomName}`

    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((response: AxiosResponse) => {
                if (response?.data) {
                    resolve({
                        roomExists: !!response.data.roomExists,
                        hasPIN: !!response.data.hasPIN,
                    })
                } else {
                    reject('Unable to validate room exists')
                }
            })
            .catch((error: AxiosError) => reject(error))
    })
}

const validatePin = (roomName: string, pin: string): Promise<boolean> => {
    const url = `${BASE_URL}/room/${roomName}/lock/${pin}`

    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((response: AxiosResponse) => {
                if (response?.data) {
                    resolve(!!response.data.pinValid)
                } else {
                    reject('Unable to validate pin')
                }
            })
            .catch((error: AxiosError) => reject(error))
    })
}

const addLog = (payload: LogPayload): Promise<void> => {
    const url = `${BASE_URL}/video-logger/`
    return axios.post(url, payload)
}

const removeParticipant = (
    roomName: string,
    participantId: string
): Promise<boolean> => {
    const url = `${BASE_URL}/rooms/${roomName}/participants/${participantId}/disconnect`
    return axios.post(url)
}

export interface ValidateRoomResponse {
    hasPIN: boolean
    roomExists: boolean
}

export interface LogPayload {
    clientName: string
    organizationID: string | null
    startAt: string
    endAt: string
    clinicalUserInformation: string | null
    clinicalUserLocation: string | null
    participantLocation: string | null
    providerID: number | null
    physicianFlag: 'Doctor' | 'Other'
}

export const videoService = {
    getAppointmentByRoomName,
    validateRoomExists,
    validatePin,
    removeParticipant,
    addLog,
}
