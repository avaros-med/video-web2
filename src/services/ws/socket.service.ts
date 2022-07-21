const WS_URL = process.env.REACT_APP_WS_URL
const WS_RECONNECT_MAX_ATTEMPTS = 3
const WS_RECONNECT_MIN_INTERVAL = 1000
const WS_RECONNECT_MAX_INTERVAL = 7000

export let socket: WebSocket | null = null

let reconnectAttemptCounter: number = 0

const initSocket = (
    roomId: string,
    eventHandler: (event: BaseEvent) => void,
    onNetworkError: () => void
): Promise<WebSocket | null> => {
    if (!WS_URL) {
        return Promise.resolve(null)
    }

    return new Promise(resolve => {
        // Create websocket
        const url = `${WS_URL}?roomName=${roomId}`
        socket = new WebSocket(url)

        // Websocket events
        socket.onopen = () => {
            // Reset reconnect attempt
            reconnectAttemptCounter = 0

            resolve(socket)
        }

        socket.onmessage = (messageEvent: MessageEvent) => {
            incomingMessageHandler(messageEvent, eventHandler)
        }

        socket.onerror = (event: Event) => {
            console.error('Socket error:', event)
            resolve(null)
            onNetworkError()
        }

        socket.onclose = (event: Event) => {
            console.error('Socket closed:', event)

            // If maximum reconnection attempt as reached then display error dialog
            // Else reconnect socket
            if (reconnectAttemptCounter >= WS_RECONNECT_MAX_ATTEMPTS) {
                onNetworkError()
            } else {
                reconnect(roomId, eventHandler, onNetworkError)
                reconnectAttemptCounter++
            }
        }
    })
}

const reconnect = (
    roomId: string,
    eventHandler: (event: BaseEvent) => void,
    onNetworkError: () => void
) => {
    setTimeout(
        () => initSocket(roomId, eventHandler, onNetworkError),
        getRandomNumber(WS_RECONNECT_MIN_INTERVAL, WS_RECONNECT_MAX_INTERVAL)
    )
}

const isOpen = (): boolean => socket?.readyState === socket?.OPEN

const incomingMessageHandler = (
    messageEvent: MessageEvent,
    eventHandler: (baseEvent: BaseEvent) => void
) => {
    const data = JSON.parse(messageEvent.data)

    // Validate event data is of BaseEvent type
    if (!BaseEvent.IsType(data)) {
        console.error('Received socket message is not a BaseEvent')
        return
    }

    const baseEvent: BaseEvent = data
    eventHandler(baseEvent)
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
    if (!isOpen()) {
        return
    }
    const baseEvent: BaseEvent = getSocketBaseEvent(type, eventout)
    socket?.send(JSON.stringify(baseEvent))
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

type BaseEventType = 'Message'

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
    reconnect,
    isOpen,
    dispatchEvent,
}
