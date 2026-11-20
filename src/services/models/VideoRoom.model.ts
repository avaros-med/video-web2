import { CurrentUser } from './CurrentUser.model'
import { Demographic } from './Demographic.model'

/**
 * A video visit's room as ehr answers it (`GET /api/v1/video/rooms/:room`): whether it is
 * locked with a PIN, the visit's times, type and provider, and, for a signed-in provider
 * of the clinic only, the provider and the visit's patient.
 */
export class VideoRoom {
    name!: string
    isLocked!: boolean
    /** Absolute times: shown in the device's own zone. */
    startAt!: Date
    /** The visit's real end. */
    endAt!: Date
    typeName!: string
    typeColor!: string | null
    provider!: VisitProvider
    /** The signed-in provider; null for anyone else (the patient). */
    signedInProvider!: CurrentUser | null
    /** The visit's patient, for the signed-in provider only; null otherwise or when none. */
    patient!: Demographic | null

    static deserialize(obj: any): VideoRoom {
        const visit = obj?.visit ?? {}
        return {
            name: obj?.room?.name ?? '',
            isLocked: !!obj?.room?.locked,
            startAt: new Date(visit.startAt),
            endAt: new Date(visit.endAt),
            typeName: visit.type?.name ?? '',
            typeColor: visit.type?.color ?? null,
            provider: {
                firstName: visit.provider?.firstName ?? '',
                lastName: visit.provider?.lastName ?? '',
                title: visit.provider?.title ?? null,
            },
            signedInProvider: obj?.signedInProvider
                ? CurrentUser.deserialize(obj.signedInProvider)
                : null,
            patient: obj?.patient ? Demographic.deserialize(obj.patient) : null,
        }
    }

    /** "Dr. Jordan Smith" */
    static getProviderName(videoRoom: VideoRoom): string {
        const { title, firstName, lastName } = videoRoom.provider
        return [title, firstName, lastName]
            .map(part => (part ?? '').trim())
            .filter(Boolean)
            .join(' ')
    }
}

export interface VisitProvider {
    firstName: string
    lastName: string
    title: string | null
}
