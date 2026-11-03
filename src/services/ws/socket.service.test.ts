export {}
/** A WebSocket stand-in that records instances and lets a test drive their events. */
class FakeSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    static instances: FakeSocket[] = []
    readyState = FakeSocket.CONNECTING
    onopen: (() => void) | null = null
    onmessage: ((e: MessageEvent) => void) | null = null
    onerror: ((e: Event) => void) | null = null
    onclose: ((e: Event) => void) | null = null
    close = jest.fn(() => {
        this.readyState = FakeSocket.CLOSED
    })
    constructor(public url: string) {
        FakeSocket.instances.push(this)
    }
    open() {
        this.readyState = FakeSocket.OPEN
        this.onopen?.()
    }
}

type Service = typeof import('./socket.service').socketService

describe('the Avaros video socket', () => {
    const realWebSocket = window.WebSocket
    let socketService: Service
    beforeEach(() => {
        // The service reads its URL when the module loads.
        process.env.REACT_APP_WS_URL = 'ws://test'
        jest.resetModules()
        socketService = require('./socket.service').socketService
        FakeSocket.instances = []
        // @ts-ignore
        window.WebSocket = FakeSocket
        jest.useFakeTimers()
    })
    afterEach(() => {
        socketService.closeSocket()
        window.WebSocket = realWebSocket
        jest.useRealTimers()
        delete process.env.REACT_APP_WS_URL
    })

    it('keeps one socket per visit: a second init closes the first without reopening it', () => {
        const handler = jest.fn()
        const onNetworkError = jest.fn()
        socketService.initSocket('room-1', handler, onNetworkError)
        const [first] = FakeSocket.instances
        first.open()

        socketService.initSocket('room-1', handler, onNetworkError)
        expect(FakeSocket.instances).toHaveLength(2)
        expect(first.close).toHaveBeenCalledTimes(1)
        // its close handler is gone, so closing it does not schedule a reconnect
        expect(first.onclose).toBeNull()
        jest.advanceTimersByTime(10000)
        expect(FakeSocket.instances).toHaveLength(2)
    })

    it('closeSocket drops a reconnect still pending', () => {
        const handler = jest.fn()
        const onNetworkError = jest.fn()
        socketService.initSocket('room-1', handler, onNetworkError)
        const [first] = FakeSocket.instances
        first.open()
        // the server drops it: a reconnect is scheduled
        first.onclose?.(new Event('close'))
        socketService.closeSocket()
        jest.advanceTimersByTime(10000)
        expect(FakeSocket.instances).toHaveLength(1)
        expect(onNetworkError).not.toHaveBeenCalled()
    })
})
