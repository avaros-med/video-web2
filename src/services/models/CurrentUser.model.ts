export class CurrentUser {
    providerNo!: string
    firstName!: string
    lastName!: string

    static deserialize(obj: any): CurrentUser {
        const model: CurrentUser = {
            providerNo: obj.provider_no,
            firstName: obj.first_name,
            lastName: obj.last_name,
        }
        return model
    }

    static getFullName(currentUser: CurrentUser): string {
        const firstName = currentUser?.firstName ?? ''
        const lastName = currentUser?.lastName ?? ''
        return [firstName, lastName].join(' ').trim()
    }
}
