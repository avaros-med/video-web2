import { roomUrl } from '../http/ehr'

/**
 * The room's event stream on ehr (`GET /api/v1/video/rooms/:room/events`, server-sent
 * events; ehr docs/schedule-video.md §4): every chat line, file offer, chart document
 * offer and "chat turned off", in order, to every page in the room. What a page sends goes
 * to ehr's REST routes (video.service.ts) and comes back to all of them here.
 *
 * One stream per visit, whatever the Room component does: `open` closes the one before.
 * The browser reconnects by itself after a drop and asks for what it missed
 * (`Last-Event-ID`); when it gives up (the stream refused, not answering), the page tries
 * again a few times, then calls `onNetworkError`.
 */

export type RoomEventType =
    | 'Message'
    | 'FileOffered'
    | 'DocumentOffered'
    | 'ChatTurnedOff'

export interface RoomEvent {
    eventID: number | string
    type: RoomEventType
    payload: any
}

const TYPES: RoomEventType[] = [
    'Message',
    'FileOffered',
    'DocumentOffered',
    'ChatTurnedOff',
]
export const REOPEN_ATTEMPTS = 3
export const REOPEN_DELAY_MS = 3000

let source: EventSource | null = null
let reopenTimer: number | null = null

/** A frame's data, when it is one of the room's events. */
export const parseRoomEvent = (data: string): RoomEvent | null => {
    try {
        const event = JSON.parse(data)
        if (
            event &&
            TYPES.includes(event.type) &&
            typeof event.payload === 'object' &&
            event.payload !== null
        ) {
            return event as RoomEvent
        }
    } catch {
        // not JSON
    }
    return null
}

/** Close the stream this service holds, if any, and drop a pending reopen. */
const close = (): void => {
    if (reopenTimer !== null) {
        window.clearTimeout(reopenTimer)
        reopenTimer = null
    }
    const old = source
    source = null
    if (!old) return
    old.onopen = null
    old.onmessage = null
    old.onerror = null
    old.close()
}

const open = (
    roomName: string,
    onEvent: (event: RoomEvent) => void,
    onNetworkError: () => void,
    attempt = 0
): void => {
    close()

    let url: string
    try {
        url = roomUrl(roomName, '/events')
    } catch (error) {
        console.error('The room has no ehr to stream from', error)
        onNetworkError()
        return
    }

    const stream = new EventSource(url)
    source = stream
    let opened = false

    stream.onopen = () => {
        opened = true
        attempt = 0
    }
    stream.onmessage = (message: MessageEvent) => {
        const event = parseRoomEvent(message.data)
        if (event) onEvent(event)
    }
    stream.onerror = () => {
        if (source !== stream || stream.readyState !== EventSource.CLOSED) {
            return // the browser is reconnecting by itself
        }
        const next = opened ? 0 : attempt + 1
        if (next > REOPEN_ATTEMPTS) {
            close()
            onNetworkError()
            return
        }
        reopenTimer = window.setTimeout(() => {
            reopenTimer = null
            open(roomName, onEvent, onNetworkError, next)
        }, REOPEN_DELAY_MS)
    }
}

const isOpen = (): boolean =>
    source !== null && source.readyState === EventSource.OPEN

export const roomEventsService = {
    open,
    close,
    isOpen,
}
