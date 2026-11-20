import axios, { AxiosError } from 'axios'
import { ChartItem, ChartItemType } from '../models/ChartItem.model'
import { Demographic } from '../models/Demographic.model'
import { VideoRoom } from '../models/VideoRoom.model'
import { authHeaders, panelUrl, roomUrl } from './ehr'

/**
 * The room page's calls to the clinic's ehr (ehr docs/schedule-video.md §4). Every call
 * carries the signed-in provider's JWT when the browser has one (`authHeaders`): it is
 * what makes the caller the provider. Without it the routes answer the patient.
 */

const config = () => ({ headers: authHeaders() })

export const isNotFound = (error: unknown): boolean =>
    (error as AxiosError)?.response?.status === 404

/** The room, its visit, and for the provider their name and the patient. 404 for none. */
const getRoom = async (roomName: string): Promise<VideoRoom> => {
    const { data } = await axios.get(roomUrl(roomName), config())
    return VideoRoom.deserialize(data)
}

/** Whether the PIN is the room's (an unlocked room takes any). */
const checkPin = async (roomName: string, pin: string): Promise<boolean> => {
    const { data } = await axios.post(
        roomUrl(roomName, '/pin'),
        { pin },
        config()
    )
    return !!data?.valid
}

export interface RoomToken {
    token: string
    /** The name given with a random `_123456` suffix: this person's identity in the room. */
    identity: string
    provider: boolean
}

/** A Twilio token for the room, for the name typed. */
const getToken = async (
    roomName: string,
    identity: string
): Promise<RoomToken> => {
    const { data } = await axios.post(
        roomUrl(roomName, '/token'),
        { identity },
        config()
    )
    return {
        token: data.token,
        identity: data.identity,
        provider: !!data.provider,
    }
}

/** A chat line; it comes back to every page in the room, this one too, on the stream. */
const sendMessage = async (
    roomName: string,
    message: string,
    senderName: string
): Promise<{ id: string }> => {
    const { data } = await axios.post(
        roomUrl(roomName, '/messages'),
        { message, senderName },
        config()
    )
    return { id: String(data?.id ?? '') }
}

/** The provider turns the room's chat off. */
const turnChatOff = async (roomName: string): Promise<void> => {
    await axios.post(roomUrl(roomName, '/chat-off'), {}, config())
}

export interface Offer {
    id: string
    name: string
}

/** Offers a file in the room: at most 10 MB, downloaded once, within 10 minutes. */
const offerFile = async (
    roomName: string,
    file: File,
    senderName: string
): Promise<Offer> => {
    const form = new FormData()
    form.append('file', file, file.name)
    form.append('senderName', senderName)
    const { data } = await axios.post(
        roomUrl(roomName, '/files'),
        form,
        config()
    )
    return { id: data.id, name: data.name }
}

/** A file offered in the room, once; 404 once taken or expired. */
const downloadFile = async (roomName: string, id: string): Promise<Blob> => {
    const { data } = await axios.get(
        roomUrl(roomName, `/files/${encodeURIComponent(id)}`),
        {
            ...config(),
            responseType: 'blob',
        }
    )
    return data
}

/** The provider removes someone from the call, by their Twilio sid or identity. */
const removeParticipant = async (
    roomName: string,
    participant: string
): Promise<void> => {
    await axios.post(
        roomUrl(
            roomName,
            `/participants/${encodeURIComponent(participant)}/disconnect`
        ),
        {},
        config()
    )
}

/**
 * The provider offers a chart document: the PDF this page downloaded from the EMR's print
 * path (with the provider's EMR session), and which chart item it is.
 */
const offerDocument = async (
    roomName: string,
    file: Blob,
    item: { type: ChartItemType; id: number },
    senderName: string
): Promise<Offer> => {
    const form = new FormData()
    form.append('file', file, 'document.pdf')
    form.append('type', item.type)
    form.append('itemId', String(item.id))
    form.append('senderName', senderName)
    const { data } = await axios.post(
        roomUrl(roomName, '/documents'),
        form,
        config()
    )
    return { id: data.id, name: data.name }
}

export type OpenedDocument = { blob: Blob } | 'wrong_birth_date' | 'gone'

/** The patient opens a chart document with their date of birth (YYYY-MM-DD). */
const openDocument = async (
    roomName: string,
    id: string,
    birthDate: string
): Promise<OpenedDocument> => {
    try {
        const { data } = await axios.post(
            roomUrl(roomName, `/documents/${encodeURIComponent(id)}/open`),
            { birthDate },
            { ...config(), responseType: 'blob' }
        )
        return { blob: data }
    } catch (error) {
        const status = (error as AxiosError)?.response?.status
        if (status === 403) return 'wrong_birth_date'
        if (status === 404) return 'gone'
        throw error
    }
}

/**
 * A visit log row (ehr fills in the clinic, the provider, the times and this caller's
 * address): at the end of a visit, and when a file is sent.
 */
const logVisit = async (
    roomName: string,
    startedAt: Date | null,
    eventDetails: string
): Promise<void> => {
    await axios.post(
        roomUrl(roomName, '/visits'),
        {
            startedAt: startedAt ? startedAt.toISOString() : undefined,
            eventDetails,
        },
        config()
    )
}

// --- the provider's side panel ---------------------------------------------------------

const searchPatients = async (
    roomName: string,
    search: string
): Promise<Demographic[]> => {
    const { data } = await axios.get(panelUrl(roomName, '/patients'), {
        ...config(),
        params: { search },
    })
    return (data?.patients ?? []).map((obj: any) =>
        Demographic.deserialize(obj)
    )
}

const getChartItems = async (
    roomName: string,
    demographicNo: number
): Promise<ChartItem[]> => {
    const { data } = await axios.get(
        panelUrl(roomName, `/patients/${demographicNo}/documents`),
        config()
    )
    return (data?.documents ?? []).map((obj: any) => ChartItem.deserialize(obj))
}

/** Files a new signed encounter note on the patient's eChart. */
const addNote = async (
    roomName: string,
    demographicNo: number,
    note: string
): Promise<void> => {
    await axios.post(
        panelUrl(roomName, `/patients/${demographicNo}/notes`),
        { note },
        config()
    )
}

/** The chart item's PDF from the EMR's own print path, with the provider's EMR session. */
const downloadChartItem = async (item: ChartItem): Promise<Blob> => {
    const { data } = await axios.get(item.downloadPath, {
        responseType: 'blob',
        withCredentials: true,
    })
    return data
}

export const videoService = {
    getRoom,
    checkPin,
    getToken,
    sendMessage,
    turnChatOff,
    offerFile,
    downloadFile,
    removeParticipant,
    offerDocument,
    openDocument,
    logVisit,
    searchPatients,
    getChartItems,
    addNote,
    downloadChartItem,
}
