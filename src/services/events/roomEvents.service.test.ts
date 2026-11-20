import {
    parseRoomEvent,
    REOPEN_ATTEMPTS,
    REOPEN_DELAY_MS,
    roomEventsService,
} from './roomEvents.service'

const ROOM = 'braamc_999998-abc'

class FakeEventSource {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSED = 2
    static instances: FakeEventSource[] = []

    readyState = FakeEventSource.CONNECTING
    onopen: (() => void) | null = null
    onmessage: ((message: { data: string }) => void) | null = null
    onerror: (() => void) | null = null
    closed = false

    constructor(public url: string) {
        FakeEventSource.instances.push(this)
    }

    close() {
        this.closed = true
        this.readyState = FakeEventSource.CLOSED
    }

    open() {
        this.readyState = FakeEventSource.OPEN
        this.onopen?.()
    }

    send(event: object) {
        this.onmessage?.({ data: JSON.stringify(event) })
    }

    fail() {
        this.readyState = FakeEventSource.CLOSED
        this.onerror?.()
    }
}

describe('the room event stream', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        FakeEventSource.instances = []
        // @ts-ignore
        window.EventSource = FakeEventSource
    })

    afterEach(() => {
        roomEventsService.close()
        jest.useRealTimers()
    })

    it("opens the room's stream on its clinic's ehr and hands over each event", () => {
        const onEvent = jest.fn()
        roomEventsService.open(ROOM, onEvent, jest.fn())

        const stream = FakeEventSource.instances[0]
        expect(stream.url).toBe(
            `http://localhost:3000/api/v1/video/rooms/${ROOM}/events`
        )
        stream.open()
        stream.send({
            eventID: '1',
            type: 'Message',
            payload: { id: 'a', message: 'Hi' },
        })
        stream.send({ eventID: '2', type: 'Unknown', payload: {} })

        expect(onEvent).toHaveBeenCalledTimes(1)
        expect(onEvent).toHaveBeenCalledWith({
            eventID: '1',
            type: 'Message',
            payload: { id: 'a', message: 'Hi' },
        })
    })

    it('keeps one stream per visit: opening again closes the one before', () => {
        roomEventsService.open(ROOM, jest.fn(), jest.fn())
        roomEventsService.open(ROOM, jest.fn(), jest.fn())

        expect(FakeEventSource.instances).toHaveLength(2)
        expect(FakeEventSource.instances[0].closed).toBe(true)
        expect(FakeEventSource.instances[1].closed).toBe(false)
    })

    it('tries again when the stream is refused, then reports the network error', () => {
        const onNetworkError = jest.fn()
        roomEventsService.open(ROOM, jest.fn(), onNetworkError)

        for (let attempt = 0; attempt < REOPEN_ATTEMPTS; attempt++) {
            FakeEventSource.instances[attempt].fail()
            jest.advanceTimersByTime(REOPEN_DELAY_MS)
        }
        expect(FakeEventSource.instances).toHaveLength(REOPEN_ATTEMPTS + 1)
        expect(onNetworkError).not.toHaveBeenCalled()

        FakeEventSource.instances[REOPEN_ATTEMPTS].fail()
        expect(onNetworkError).toHaveBeenCalledTimes(1)
    })

    it('leaves a drop to the browser while it reconnects by itself', () => {
        const onNetworkError = jest.fn()
        roomEventsService.open(ROOM, jest.fn(), onNetworkError)
        const stream = FakeEventSource.instances[0]
        stream.open()
        stream.readyState = FakeEventSource.CONNECTING
        stream.onerror?.()

        jest.advanceTimersByTime(REOPEN_DELAY_MS)
        expect(FakeEventSource.instances).toHaveLength(1)
        expect(onNetworkError).not.toHaveBeenCalled()
    })

    it('reports a room with no clinic in its name at once', () => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
        const onNetworkError = jest.fn()
        roomEventsService.open('999998-abc', jest.fn(), onNetworkError)
        expect(FakeEventSource.instances).toHaveLength(0)
        expect(onNetworkError).toHaveBeenCalled()
    })
})

describe('parseRoomEvent', () => {
    it("reads the room's events and nothing else", () => {
        expect(
            parseRoomEvent(
                '{"eventID":"3","type":"ChatTurnedOff","payload":{}}'
            )
        ).toEqual({
            eventID: '3',
            type: 'ChatTurnedOff',
            payload: {},
        })
        expect(parseRoomEvent('not json')).toBeNull()
        expect(parseRoomEvent('{"type":"Message"}')).toBeNull()
    })
})
