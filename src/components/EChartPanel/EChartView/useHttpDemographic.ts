import { useCallback } from 'react'
import { useHttp } from '../../../hooks/useHttp'
import { oscarService } from '../../../services/http/oscar.service'
import { Demographic } from '../../../services/models/Demographic.model'
import { DemographicDocument } from '../../../services/models/DemographicDocument.model'

enum REQUEST {
    SEARCH_DEMOGRAPHICS = 'SEARCH_DEMOGRAPHICS',
    GET_DOCUMENTS = 'GET_DOCUMENTS',
    GET_DOCUMENT_URL = 'GET_DOCUMENT_URL',
    AUTHENTICATE_DOCUMENT = 'AUTHENTICATE_DOCUMENT',
    CREATE_NOTE = 'CREATE_NOTE',
}

export const useHttpDemographic = () => {
    const { responseData, isLoading, requestId, sendRequest } = useHttp()

    const searchDemographic = useCallback(
        (searchTerm: string): Promise<Demographic[]> => {
            return sendRequest(
                oscarService.searchDemographic.bind({}, searchTerm),
                REQUEST.SEARCH_DEMOGRAPHICS
            )
        },
        [sendRequest]
    )

    const getDocuments = useCallback(
        (demographicNo: number): Promise<DemographicDocument[]> => {
            return sendRequest(
                oscarService.getDemographicDocuments.bind({}, demographicNo),
                REQUEST.GET_DOCUMENTS
            )
        },
        [sendRequest]
    )

    const getDocumentUrl = useCallback(
        (
            demographicNo: number,
            id: number,
            name: string,
            type: string
        ): Promise<string> => {
            return sendRequest(
                oscarService.getDemographicDocumentUrl.bind(
                    {},
                    demographicNo,
                    id,
                    name,
                    type
                ),
                REQUEST.GET_DOCUMENT_URL
            )
        },
        [sendRequest]
    )

    const authenticateDemographicDocument = useCallback(
        async (
            id: number,
            name: string,
            type: string,
            patientDOB: string
        ): Promise<boolean> => {
            return sendRequest(
                oscarService.authenticateDemographicDocument.bind(
                    {},
                    id,
                    name,
                    type,
                    patientDOB
                ),
                REQUEST.AUTHENTICATE_DOCUMENT
            )
                .then(response => response)
                .catch(() => false)
        },
        [sendRequest]
    )

    const createNote = useCallback(
        (demographicNo: number, note: string): Promise<void> => {
            return sendRequest(
                oscarService.createNote.bind({}, demographicNo, note),
                REQUEST.CREATE_NOTE
            )
        },
        [sendRequest]
    )

    const demographics: Demographic[] =
        requestId === REQUEST.SEARCH_DEMOGRAPHICS ? responseData ?? [] : []

    const demographicDocuments: DemographicDocument[] =
        requestId === REQUEST.GET_DOCUMENTS ? responseData ?? [] : []

    return {
        isLoading,
        demographics,
        demographicDocuments,
        searchDemographic,
        getDocuments,
        getDocumentUrl,
        authenticateDemographicDocument,
        createNote,
    }
}
