import { useCallback } from 'react'
import { useHttp } from '../../../hooks/useHttp'
import { oscarService } from '../../../services/http/oscar.service'
import { Demographic } from '../../../services/models/Demographic.model'

enum REQUEST {
    SEARCH_DEMOGRAPHICS = 'SEARCH_DEMOGRAPHICS',
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

    const createNote = useCallback(
        (demographicNo: number, note: string): Promise<Demographic[]> => {
            return sendRequest(
                oscarService.createNote.bind({}, demographicNo, note),
                REQUEST.CREATE_NOTE
            )
        },
        [sendRequest]
    )

    const demographics =
        requestId === REQUEST.SEARCH_DEMOGRAPHICS ? responseData ?? [] : []

    return {
        isLoading,
        demographics,
        searchDemographic,
        createNote,
    }
}
