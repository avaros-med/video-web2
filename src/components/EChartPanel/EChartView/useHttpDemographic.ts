import { useCallback } from 'react'
import { useHttp } from '../../../hooks/useHttp'
import { oscarService } from '../../../services/http/oscar.service'
import { Demographic } from '../../../services/models/Demographic.model'

enum REQUEST {
    SEARCH_DEMOGRAPHICS = 'SEARCH_DEMOGRAPHICS',
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

    const demographics =
        requestId === REQUEST.SEARCH_DEMOGRAPHICS ? responseData ?? [] : []

    return {
        isLoading,
        demographics,
        searchDemographic,
    }
}
