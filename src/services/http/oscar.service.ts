import axios, { AxiosError, AxiosResponse } from 'axios'
import { Demographic } from '../models/Demographic.model'
import { DemographicDocument } from '../models/PatientDocument.model'

const BASE_URL = `${process.env.REACT_APP_OSCAR_BASE_URL}/ws/rs/video/v2`

const searchDemographic = (searchTerm: string): Promise<Demographic[]> => {
    const url = `${BASE_URL}/demographics/search?search_term=${searchTerm}`

    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((response: AxiosResponse) => {
                if (response?.data?.results?.length) {
                    const demographics = response.data.results.map((obj: any) =>
                        Demographic.deserialize(obj)
                    )
                    resolve(demographics)
                } else {
                    resolve([])
                }
            })
            .catch((error: AxiosError) => reject(error))
    })
}

const createNote = (demographicNo: number, note: string): Promise<boolean> => {
    const url = `${BASE_URL}/demographics/${demographicNo}/notes`
    const payload = {
        note,
    }

    return new Promise((resolve, reject) => {
        axios
            .post(url, payload)
            .then(() => resolve(true))
            .catch((error: AxiosError) => reject(error))
    })
}

const getDemographicDocuments = (
    demographicNo: number
): Promise<DemographicDocument[]> => {
    const url = `${BASE_URL}/demographics/${demographicNo}/documents`

    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then((response: AxiosResponse) => {
                let demographicDocuments: DemographicDocument[] = []
                demographicDocuments = demographicDocuments.concat(
                    response.data?.documents?.map(
                        (obj: any) => DemographicDocument.deserialize(obj) ?? []
                    )
                )
                demographicDocuments = demographicDocuments.concat(
                    response.data?.eforms?.map(
                        (obj: any) => DemographicDocument.deserialize(obj) ?? []
                    )
                )
                demographicDocuments = demographicDocuments.concat(
                    response.data?.forms?.map(
                        (obj: any) => DemographicDocument.deserialize(obj) ?? []
                    )
                )
                resolve(demographicDocuments)
            })
            .catch((error: AxiosError) => reject(error))
    })
}

export const oscarService = {
    searchDemographic,
    createNote,
    getDemographicDocuments,
}
