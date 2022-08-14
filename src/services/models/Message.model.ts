import { DemographicDocumentType } from './DemographicDocument.model'

export class Message {
    ID!: number
    message!: string
    roomName!: string
    fromProvider!: boolean
    senderName!: string
    createdAt!: Date

    constructor(message: Message) {
        this.ID = message.ID
        this.message = message.message
        this.roomName = message.roomName
        this.fromProvider = message.fromProvider
        this.senderName = message.senderName
        this.createdAt = message.createdAt
    }

    static deserialize(obj: any): Message {
        const model: Message = Object.assign({}, obj)
        if (obj.createdAt) {
            model.createdAt = new Date(obj.createdAt)
        }
        model.message = obj.description
        return model
    }
}

export class AttachmentMessage {
    ID!: number
    demographicDocumentID!: number
    documentName!: string
    documentType!: DemographicDocumentType
    demographicName!: string
    senderName!: string
    fromProvider!: boolean
    bytes!: string
    createdAt!: Date

    constructor(attachmentMessage: AttachmentMessage) {
        this.ID = attachmentMessage.ID
        this.demographicDocumentID = attachmentMessage.demographicDocumentID
        this.documentName = attachmentMessage.documentName
        this.documentType = attachmentMessage.documentType
        this.demographicName = attachmentMessage.demographicName
        this.senderName = attachmentMessage.senderName
        this.fromProvider = attachmentMessage.fromProvider
        this.bytes = attachmentMessage.bytes
        this.createdAt = attachmentMessage.createdAt
    }

    static deserialize(obj: any): AttachmentMessage {
        const model: AttachmentMessage = {
            ID: obj.ID,
            demographicDocumentID: obj.id ?? obj.ID,
            documentName: obj.name,
            documentType: obj.type,
            demographicName: obj.demographicName,
            senderName: obj.senderName,
            fromProvider: obj.fromProvider,
            bytes: obj.bytes,
            createdAt: new Date(),
        }
        return model
    }
}
