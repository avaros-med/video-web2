export class Demographic {
    demographicNo!: number
    firstName!: string
    lastName!: string
    dob!: string
    hin!: string
    hinVersion!: string
    sex!: string
    email!: string

    static deserialize(obj: any): Demographic {
        const model: Demographic = {
            demographicNo: obj.demographic_no,
            firstName: obj.first_name,
            lastName: obj.last_name,
            dob: obj.dob,
            hin: obj.hin,
            hinVersion: obj.hin_version,
            sex: obj.sex,
            email: obj.email,
        }
        return model
    }

    static getFullName(demographic: Demographic): string {
        return `${demographic.firstName} ${demographic.lastName}`
    }
}
