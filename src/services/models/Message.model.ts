export class Message {
    ID!: number
    message!: string
    roomName!: string
    fromProvider!: boolean
    senderName!: string
    createdAt!: Date

    static deserialize(obj: any): Message {
        const model: Message = Object.assign({}, obj)
        if (obj.createdAt) {
            model.createdAt = new Date(obj.createdAt)
        }
        model.message = obj.description
        return model
    }
}
