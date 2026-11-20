import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useHttp } from '../../../hooks/useHttp'
import { videoService } from '../../../services/http/video.service'
import { ChartItem } from '../../../services/models/ChartItem.model'
import { Demographic } from '../../../services/models/Demographic.model'

enum REQUEST {
    SEARCH_DEMOGRAPHICS = 'SEARCH_DEMOGRAPHICS',
    GET_DOCUMENTS = 'GET_DOCUMENTS',
    CREATE_NOTE = 'CREATE_NOTE',
}

/**
 * The provider's side panel on ehr (ehr docs/schedule-video.md V5, V15): the patient
 * search, the patient's chart items and the encounter note, on the room's clinic's ehr.
 */
export const useHttpDemographic = () => {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const roomName = URLRoomName ?? ''
    const { responseData, isLoading, requestId, sendRequest } = useHttp()

    const searchDemographic = useCallback(
        (searchTerm: string): Promise<Demographic[]> =>
            sendRequest(
                () => videoService.searchPatients(roomName, searchTerm),
                REQUEST.SEARCH_DEMOGRAPHICS
            ),
        [roomName, sendRequest]
    )

    const getDocuments = useCallback(
        (demographicNo: number): Promise<ChartItem[]> =>
            sendRequest(
                () => videoService.getChartItems(roomName, demographicNo),
                REQUEST.GET_DOCUMENTS
            ),
        [roomName, sendRequest]
    )

    // Rejects when the note was not filed (useHttp resolves with the error otherwise).
    const createNote = useCallback(
        (demographicNo: number, note: string): Promise<void> =>
            videoService.addNote(roomName, demographicNo, note),
        [roomName]
    )

    const demographics: Demographic[] =
        requestId === REQUEST.SEARCH_DEMOGRAPHICS && Array.isArray(responseData)
            ? responseData
            : []

    const demographicDocuments: ChartItem[] =
        requestId === REQUEST.GET_DOCUMENTS && Array.isArray(responseData)
            ? responseData
            : []

    return {
        isLoading,
        demographics,
        demographicDocuments,
        searchDemographic,
        getDocuments,
        createNote,
    }
}
