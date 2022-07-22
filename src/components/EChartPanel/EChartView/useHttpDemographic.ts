import { useCallback } from 'react'
import { useHttp } from '../../../hooks/useHttp'
import { oscarService } from '../../../services/http/oscar.service'
import { Demographic } from '../../../services/models/Demographic.model'
import { DemographicDocument } from '../../../services/models/PatientDocument.model'

enum REQUEST {
    SEARCH_DEMOGRAPHICS = 'SEARCH_DEMOGRAPHICS',
    GET_DOCUMENTS = 'GET_DOCUMENTS',
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
        createNote,
    }
}
