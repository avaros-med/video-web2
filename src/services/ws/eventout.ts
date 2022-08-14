import { DemographicDocumentType } from '../models/DemographicDocument.model'

export class SendMessage {
    ID!: number
    description!: string
    roomName!: string
    fromProvider!: boolean
    senderName!: string
    createdAt!: string
}

export class SendAttachmentRequest {
    ID!: number
    name!: string
    type!: DemographicDocumentType
    demographicName!: string
    roomName!: string
    fromProvider!: boolean
    senderName!: string
    bytes!: string
}

export class AuthenticateAttachment {
    ID!: number
    name!: string
    type!: DemographicDocumentType
    roomName!: string
    patientDOB!: string
    senderName!: string
}

export class SendAttachment {
    name!: string
    bytes!: string
    senderName!: string
    roomName!: string
}
