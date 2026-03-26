const SSE_URL = process.env.REACT_APP_SSE_URL
const VIDEO_BASE_URL = process.env.REACT_APP_VIDEO_BASE_URL

const SSE_RECONNECT_MAX_ATTEMPTS = 3
const SSE_RECONNECT_MIN_INTERVAL = 1000
const SSE_RECONNECT_MAX_INTERVAL = 7000

export let eventSource: EventSource | null = null

let reconnectAttemptCounter: number = 0
let currentRoomId: string | null = null
let currentEventHandler: ((event: BaseEvent) => void) | null = null
let currentOnNetworkError: (() => void) | null = null

const initSocket = (
    roomId: string,
    eventHandler: (event: BaseEvent) => void,
    onNetworkError: () => void
): Promise<EventSource | null> => {
    if (!SSE_URL) {
        return Promise.resolve(null)
    }

    currentRoomId = roomId
    currentEventHandler = eventHandler
    currentOnNetworkError = onNetworkError

    return new Promise(resolve => {
        const url = `${SSE_URL}?roomName=${roomId}`
        eventSource = new EventSource(url)

        eventSource.onopen = () => {
            reconnectAttemptCounter = 0
            resolve(eventSource)
        }

        eventSource.onmessage = (messageEvent: MessageEvent) => {
            if (currentEventHandler) {
                incomingMessageHandler(messageEvent, currentEventHandler)
            }
        }

        eventSource.onerror = () => {
            // EventSource auto-reconnects, but we track failures to enforce a limit
            if (reconnectAttemptCounter >= SSE_RECONNECT_MAX_ATTEMPTS) {
                eventSource?.close()
                eventSource = null
                if (currentOnNetworkError) {
                    currentOnNetworkError()
                }
            } else {
                reconnectAttemptCounter++
                eventSource?.close()
                eventSource = null
                resolve(null)
                setTimeout(() => {
                    if (
                        currentRoomId &&
                        currentEventHandler &&
                        currentOnNetworkError
                    ) {
                        initSocket(
                            currentRoomId,
                            currentEventHandler,
                            currentOnNetworkError
                        )
                    }
                }, getRandomNumber(SSE_RECONNECT_MIN_INTERVAL, SSE_RECONNECT_MAX_INTERVAL))
            }
        }
    })
}

const isOpen = (): boolean =>
    eventSource !== null && eventSource.readyState === EventSource.OPEN

const incomingMessageHandler = (
    messageEvent: MessageEvent,
    eventHandler: (baseEvent: BaseEvent) => void
) => {
    let data: any
    try {
        data = JSON.parse(messageEvent.data)
    } catch {
        console.error('Failed to parse SSE message as JSON')
        return
    }

    if (!BaseEvent.IsType(data)) {
        console.error('Received SSE message is not a BaseEvent')
        return
    }

    eventHandler(data as BaseEvent)
}

// Map from event type to the REST path segment under /room/{room}/
const typeToPath: Partial<Record<BaseEventType, string>> = {
    Message: 'message',
    SendAttachmentRequest: 'attachment-request',
    AuthenticateAttachment: 'authenticate-attachment',
    SendAttachment: 'attachment',
}

export function getSocketBaseEvent(type: BaseEventType, eventout: any) {
    const baseEvent: BaseEvent = {
        service: 'video',
        eventID: generateBaseEventId(),
        type,
        payload: { ...eventout },
    }
    return baseEvent
}

const dispatchEvent = (type: BaseEventType, eventout: any) => {
    if (!isOpen() || !currentRoomId) {
        return
    }

    const pathSegment = typeToPath[type]
    if (!pathSegment) {
        // BlockChat has no server handler — intentional no-op
        return
    }

    const url = `${VIDEO_BASE_URL}/room/${currentRoomId}/${pathSegment}/`
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventout),
    }).catch(err => {
        console.error(`Failed to dispatch ${type} event:`, err)
    })
}

export class BaseEvent {
    service!: 'video'
    type!: BaseEventType
    payload!: object
    eventID!: string

    static IsType(obj: any): BaseEvent | null {
        const hasType: boolean = typeof obj.type === 'string'
        const hasPayload: boolean = typeof obj.payload === 'object'
        const hasEventID: boolean = typeof obj.eventID === 'string'
        if (!hasType) {
            console.debug('Incorrect or non-existant type property')
            return null
        }
        if (!hasPayload) {
            console.debug('Incorrect or non-existant payload property')
            return null
        }
        if (!hasEventID) {
            console.debug('Incorrect or non-existant eventID property')
            return null
        }
        return obj as BaseEvent
    }
}

type BaseEventType =
    | 'Message'
    | 'SendAttachmentRequest'
    | 'AuthenticateAttachment'
    | 'SendAttachment'
    | 'BlockChat'

const getRandomNumber = (min: number, max: number) => {
    return Math.random() * (max - min) + min
}

// Generate random eventID for BaseEvent
const RAND_RANGE = 1000000000
export const generateBaseEventId = (): string => {
    const now = Date.now()
    const randNum = Math.round(Math.random() * RAND_RANGE)
    let randPadded = randNum.toString()
    randPadded = randPadded.padStart(randPadded.length, '0')
    return now.toString() + '-' + randPadded
}

export const socketService = {
    initSocket,
    isOpen,
    dispatchEvent,
}
