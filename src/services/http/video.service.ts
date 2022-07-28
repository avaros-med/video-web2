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

export const videoService = {
    getAppointmentByRoomName,
}
