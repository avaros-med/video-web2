export class DemographicDocument {
    id!: number
    title!: string
    type!: DemographicDocumentType
    createdAt!: Date

    static deserialize(obj: any): DemographicDocument {
        const model: DemographicDocument = Object.assign({}, obj)
        model.type = obj.content_type
        if (obj.createdAt) {
            model.createdAt = new Date(obj.created_at)
        }
        return model
    }
}

export type DemographicDocumentType = 'document' | 'eform' | 'forms'
