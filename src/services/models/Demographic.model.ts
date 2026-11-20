/** A patient in the provider's side panel: the visit's, or one found by the search. */
export class Demographic {
    demographicNo!: number
    firstName!: string
    lastName!: string
    /** YYYY-MM-DD; only the search answers it. */
    dateOfBirth?: string | null
    sex?: string | null

    static deserialize(obj: any): Demographic {
        return {
            demographicNo: Number(obj?.demographicNo),
            firstName: obj?.firstName ?? '',
            lastName: obj?.lastName ?? '',
            dateOfBirth: obj?.dateOfBirth ?? null,
            sex: obj?.sex ?? null,
        }
    }

    static getFullName(demographic: Demographic): string {
        return `${demographic.firstName} ${demographic.lastName}`.trim()
    }
}
