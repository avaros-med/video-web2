/**
 * What the room's chat shows, from the room's stream (ehr docs/schedule-video.md §4): a
 * line (`Message`) and a file offered (`FileOffered`, or `DocumentOffered` for a chart
 * document the patient opens with their date of birth).
 *
 * `senderName` is the sender's Twilio identity (the name they joined with and a
 * `_123456` suffix): unique in the room, so it tells this page's own lines from the
 * others'. `displayName` strips the suffix for showing.
 */
export class Message {
    id!: string
    message!: string
    senderName!: string
    fromProvider!: boolean
    createdAt!: Date

    constructor(message: Message) {
        Object.assign(this, message)
    }

    static deserialize(obj: any): Message {
        return new Message({
            id: String(obj?.id ?? ''),
            message: obj?.message ?? '',
            senderName: obj?.senderName ?? '',
            fromProvider: !!obj?.fromProvider,
            createdAt: obj?.sentAt ? new Date(obj.sentAt) : new Date(),
        })
    }
}

export class FileOffer {
    id!: string
    name!: string
    size!: number
    contentType!: string
    expiresAt!: Date
    senderName!: string
    fromProvider!: boolean
    /** A chart document: opened with the patient's date of birth. */
    isDocument!: boolean
    createdAt!: Date

    constructor(offer: FileOffer) {
        Object.assign(this, offer)
    }

    static deserialize(obj: any, isDocument: boolean): FileOffer {
        return new FileOffer({
            id: String(obj?.id ?? ''),
            name: obj?.name ?? 'file',
            size: Number(obj?.size ?? 0),
            contentType: obj?.contentType ?? 'application/octet-stream',
            expiresAt: new Date(obj?.expiresAt),
            senderName: obj?.senderName ?? '',
            fromProvider: !!obj?.fromProvider,
            isDocument,
            createdAt: new Date(),
        })
    }
}

export type ChatItem = Message | FileOffer

/** The name someone joined with: their identity without the `_123456` suffix. */
export const displayName = (identity: string): string =>
    (identity ?? '').replace(/_\d{6}$/, '')
