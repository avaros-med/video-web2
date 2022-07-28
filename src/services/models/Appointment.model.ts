export class Appointment {
    demographicID!: number
    providerID!: number
    startAt!: Date
    endAt!: Date
    roomID!: number
    details!: AppointmentDetails

    static deserialize(obj: any): Appointment {
        const model: Appointment = Object.assign({}, obj)
        if (obj.startAt) {
            model.startAt = new Date(obj.startAt)
        }
        if (obj.endAt) {
            model.endAt = new Date(obj.endAt)
        }
        model.details = AppointmentDetails.deserialize(obj.details)
        return model
    }
}

export class AppointmentDetails {
    appointmentTypeColor!: string
    appointmentTypeName!: string
    providerName!: string

    static deserialize(obj: any): AppointmentDetails {
        const model: AppointmentDetails = Object.assign({}, obj)
        return model
    }
}
