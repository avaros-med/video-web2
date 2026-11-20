/**
 * One item of the patient's chart the provider may pass in the visit (ehr
 * `GET /api/v1/video/patients/:id/documents`): a document, a current eForm or a Lab Req
 * 2019 form, with the path of the EMR's own print of it on this page's host.
 */
export class ChartItem {
    id!: number
    type!: ChartItemType
    title!: string
    /** YYYY-MM-DD; null when the chart has no date for it. */
    createdAt!: string | null
    downloadPath!: string

    static deserialize(obj: any): ChartItem {
        return {
            id: Number(obj?.id),
            type: obj?.type,
            title: obj?.title ?? '',
            createdAt: obj?.createdAt ?? null,
            downloadPath: obj?.downloadPath ?? '',
        }
    }
}

export type ChartItemType = 'document' | 'eform' | 'forms'
