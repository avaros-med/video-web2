/** The signed-in provider, as ehr names them from their JWT (`signedInProvider`). */
export class CurrentUser {
    providerNo!: string
    firstName!: string
    lastName!: string

    static deserialize(obj: any): CurrentUser {
        return {
            providerNo: String(obj?.providerNo ?? ''),
            firstName: obj?.firstName ?? '',
            lastName: obj?.lastName ?? '',
        }
    }

    static getFullName(currentUser: CurrentUser): string {
        const firstName = currentUser?.firstName ?? ''
        const lastName = currentUser?.lastName ?? ''
        return [firstName, lastName].join(' ').trim()
    }
}
