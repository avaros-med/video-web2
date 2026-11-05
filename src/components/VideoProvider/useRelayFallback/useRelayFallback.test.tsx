import { act, renderHook } from '@testing-library/react-hooks'
import EventEmitter from 'events'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'
import { FORCE_RELAY_KEY } from '../../../constants'
import useRelayFallback, {
    isRelayReconnectInProgress,
    outboundSamples,
    RECONNECT_WAIT_MS,
    START_GRACE_MS,
    STATS_POLL_MS,
} from './useRelayFallback'

function makeTrack(kind: string, overrides: Record<string, unknown> = {}) {
    return {
        kind,
        name: kind === 'audio' ? 'microphone' : 'camera',
        isEnabled: true,
        mediaStreamTrack: { readyState: 'live', muted: false },
        ...overrides,
    }
}

function makeRoom(bytesSent = () => 0) {
    const room: any = new EventEmitter()
    room.sid = 'RM1'
    room.state = 'connected'
    // one remote participant, connected: the normal two-person call
    room.participants = new Map([['PA1', { state: 'connected' }]])
    room.localParticipant = {
        audioTracks: new Map([
            ['MTa', { trackSid: 'MTa', track: makeTrack('audio') }],
        ]),
        videoTracks: new Map([
            ['MTv', { trackSid: 'MTv', track: makeTrack('video') }],
        ]),
    }
    room.getStats = jest.fn(() =>
        Promise.resolve([
            {
                localAudioTrackStats: [
                    { trackSid: 'MTa', bytesSent: bytesSent() },
                ],
                localVideoTrackStats: [
                    { trackSid: 'MTv', bytesSent: bytesSent() },
                ],
            },
        ])
    )
    // twilio-video emits 'disconnected' a moment after disconnect()
    room.disconnect = jest.fn(() => {
        setTimeout(() => room.emit('disconnected', room), DISCONNECTED_DELAY_MS)
    })
    return room
}

const DISCONNECTED_DELAY_MS = 50
/** A JWT with the given expiry, seconds from now; nobody here checks its signature. */
const jwtExpiringIn = (seconds: number) => {
    const b64 = (o: unknown) =>
        window
            .btoa(JSON.stringify(o))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
    const exp = Math.floor(Date.now() / 1000) + seconds
    return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ exp })}.sig`
}
const tok = jwtExpiringIn(4 * 3600)
const relayedRoom = { sid: 'RM2' } as any
const connectOk = () => jest.fn(() => Promise.resolve(relayedRoom))

/** Run one stats poll. */
const onePoll = async () => {
    await act(async () => {
        jest.advanceTimersByTime(STATS_POLL_MS)
        await flush()
    })
}
const relayOverrides = { rtcConfiguration: { iceTransportPolicy: 'relay' } }

const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
}

/** Emit a 53405 'reconnecting' and let the SDK's own recovery window elapse. */
async function failMediaConnection(room: any) {
    await act(async () => {
        room.emit('reconnecting', {
            code: 53405,
            message: 'Media connection failed',
        })
        jest.advanceTimersByTime(RECONNECT_WAIT_MS)
        await flush()
    })
}

/** jsdom exposes navigator.onLine as a prototype getter; redefine it per test (restored in afterEach). */
function setOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => value,
    })
}

describe('the useRelayFallback hook', () => {
    let logSpy: jest.SpyInstance
    beforeEach(() => {
        window.localStorage.clear()
        // @ts-ignore
        delete window.sessionStartedAt
        jest.useFakeTimers()
        logSpy = jest
            .spyOn(diagnosticsService, 'log')
            .mockImplementation(() => ({} as any))
    })
    afterEach(() => {
        logSpy.mockRestore()
        jest.useRealTimers()
        setOnline(true)
    })

    it('moves the call to relay when the SDK cannot recover a failed media connection', async () => {
        const room = makeRoom()
        const tokenRef = { current: tok }
        const startedAt = new Date('2026-10-28T13:00:00Z')
        // @ts-ignore
        window.sessionStartedAt = startedAt
        let relayedBytes = 0
        const relayed = makeRoom(() => (relayedBytes += 500))
        relayed.sid = 'RM2'
        const connect = jest.fn(() => Promise.resolve(relayed))
        const { result, rerender } = renderHook(
            ({ current }) => useRelayFallback(current, connect, tokenRef, true),
            { initialProps: { current: room } }
        )

        await failMediaConnection(room)
        expect(room.disconnect).toHaveBeenCalledTimes(1)
        expect(isRelayReconnectInProgress()).toBe(true)
        expect(result.current.isReconnecting).toBe(true)
        // nothing is remembered until the relayed rejoin has connected
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()

        await act(async () => {
            jest.advanceTimersByTime(DISCONNECTED_DELAY_MS) // the mocked 'disconnected'
            await flush()
        })
        expect(connect).toHaveBeenCalledWith(tok, relayOverrides)
        expect(isRelayReconnectInProgress()).toBe(false)
        expect(result.current.isReconnecting).toBe(false)
        expect(result.current.isRelayActive).toBe(true)
        // @ts-ignore - the visit log keeps the original start time
        expect(window.sessionStartedAt).toBe(startedAt)
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback', {
            reason: 'media-connection-failed',
            code: 53405,
            message: 'Media connection failed',
            waitedSeconds: 10,
        })
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback-connected')
        // ...and still nothing is remembered until relayed media is seen flowing
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()

        rerender({ current: relayed })
        await onePoll() // baseline
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()
        await onePoll() // bytes moved
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBe('true')
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback-remembered')
    })

    it('does not remember relay when the relayed rejoin connects but still carries nothing', async () => {
        const room = makeRoom()
        const relayed = makeRoom(() => 0)
        relayed.sid = 'RM2'
        const connect = jest.fn(() => Promise.resolve(relayed))
        const { rerender } = renderHook(
            ({ current }) =>
                useRelayFallback(current, connect, { current: tok }, true),
            { initialProps: { current: room } }
        )
        await failMediaConnection(room)
        await act(async () => {
            jest.advanceTimersByTime(DISCONNECTED_DELAY_MS)
            await flush()
        })
        rerender({ current: relayed })
        for (let i = 0; i < 6; i++) await onePoll()
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()
        expect(logSpy).not.toHaveBeenCalledWith(
            'room',
            'relay-fallback-remembered'
        )
    })

    it("does not read the SDK's own reconnect as an outbound stall", async () => {
        const room = makeRoom(() => 0)
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS)
            await flush()
        })
        // flat counters while the room is reconnecting do not count
        room.state = 'reconnecting'
        for (let i = 0; i < 8; i++) await onePoll()
        expect(room.disconnect).not.toHaveBeenCalled()
        // once connected again the grace period and the detector start over
        room.state = 'connected'
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS)
            await flush()
        })
        for (let i = 0; i < 4; i++) await onePoll()
        expect(room.disconnect).not.toHaveBeenCalled()
        await onePoll()
        expect(room.disconnect).toHaveBeenCalledTimes(1)
    })

    it('leaves the call alone when the other participant is the one reconnecting', async () => {
        const room = makeRoom(() => 0)
        room.participants = new Map([['PA1', { state: 'reconnecting' }]])
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await failMediaConnection(room)
        expect(room.disconnect).not.toHaveBeenCalled()
        expect(connect).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledWith(
            'room',
            'relay-fallback-skipped',
            expect.objectContaining({ reason: 'media-connection-failed' })
        )
        // nor do flat counters count while they are away
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS + 6 * STATS_POLL_MS)
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()
    })

    it('restarts the recovery window when the other participant comes back late in it', async () => {
        const room = makeRoom()
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await act(async () => {
            room.emit('reconnecting', {
                code: 53405,
                message: 'Media connection failed',
            })
            jest.advanceTimersByTime(RECONNECT_WAIT_MS - 1000)
            // their outage ends one second before the window would have closed
            room.emit('participantReconnected', { state: 'connected' })
            jest.advanceTimersByTime(1000)
            await flush()
        })
        // our ICE restart after their return gets a whole window of its own
        expect(room.disconnect).not.toHaveBeenCalled()
        await act(async () => {
            jest.advanceTimersByTime(RECONNECT_WAIT_MS - 1000)
            await flush()
        })
        expect(room.disconnect).toHaveBeenCalledTimes(1)
        expect(logSpy).toHaveBeenCalledWith(
            'room',
            'relay-fallback',
            expect.objectContaining({ reason: 'media-connection-failed' })
        )
    })

    it('judges the failure once the other participant is back, if the room is still reconnecting', async () => {
        const room = makeRoom()
        room.participants = new Map([['PA1', { state: 'reconnecting' }]])
        room.state = 'reconnecting'
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await failMediaConnection(room)
        // the window ended while they were away: skipped, not judged
        expect(room.disconnect).not.toHaveBeenCalled()
        await act(async () => {
            room.participants = new Map([['PA1', { state: 'connected' }]])
            room.emit('participantReconnected', { state: 'connected' })
            jest.advanceTimersByTime(RECONNECT_WAIT_MS - 1000)
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()
        await act(async () => {
            jest.advanceTimersByTime(1000)
            await flush()
        })
        expect(room.disconnect).toHaveBeenCalledTimes(1)
        await act(async () => {
            jest.advanceTimersByTime(DISCONNECTED_DELAY_MS)
            await flush()
        })
        expect(connect).toHaveBeenCalledWith(tok, relayOverrides)
    })

    it('leaves the room alone when the media connection fails while this browser is offline', async () => {
        const room = makeRoom()
        const connect = connectOk()
        setOnline(false)
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await failMediaConnection(room)
        // a laptop Wi-Fi drop looks like a dead direct path from inside the window;
        // the SDK's own restart recovers it once the network is back, so no rejoin
        expect(room.disconnect).not.toHaveBeenCalled()
        expect(connect).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback-skipped', {
            reason: 'media-connection-failed',
            why: 'offline',
        })
    })

    it('judges the failure once the network is back, if the room is still reconnecting', async () => {
        const room = makeRoom()
        room.state = 'reconnecting'
        const connect = connectOk()
        setOnline(false)
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await failMediaConnection(room)
        // the window ended while offline: skipped, not judged
        expect(room.disconnect).not.toHaveBeenCalled()
        setOnline(true)
        await act(async () => {
            window.dispatchEvent(new Event('online'))
            jest.advanceTimersByTime(RECONNECT_WAIT_MS - 1000)
            await flush()
        })
        // the restart after the network returns gets a whole window of its own
        expect(room.disconnect).not.toHaveBeenCalled()
        await act(async () => {
            jest.advanceTimersByTime(1000)
            await flush()
        })
        expect(room.disconnect).toHaveBeenCalledTimes(1)
        await act(async () => {
            jest.advanceTimersByTime(DISCONNECTED_DELAY_MS)
            await flush()
        })
        expect(connect).toHaveBeenCalledWith(tok, relayOverrides)
    })

    it('does not treat waiting alone in the room as a stall', async () => {
        const room = makeRoom(() => 0)
        room.participants = new Map()
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS + 8 * STATS_POLL_MS)
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()
        expect(connect).not.toHaveBeenCalled()
    })

    it("leaves a call alone when the SDK's own ICE restart recovers in time", async () => {
        const room = makeRoom()
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await act(async () => {
            room.emit('reconnecting', { code: 53405 })
            jest.advanceTimersByTime(RECONNECT_WAIT_MS / 2)
            room.emit('reconnected')
            jest.advanceTimersByTime(RECONNECT_WAIT_MS)
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()
        expect(connect).not.toHaveBeenCalled()
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()
    })

    it('moves the call to relay when no bytes leave the live, unmuted tracks after the grace period', async () => {
        const room = makeRoom(() => 0)
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )

        // during the grace period nothing happens even though nothing is sent
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS)
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()

        // baseline poll + 4 flat polls
        for (let i = 0; i < 5; i++) {
            await act(async () => {
                jest.advanceTimersByTime(STATS_POLL_MS)
                await flush()
            })
        }
        expect(room.disconnect).toHaveBeenCalledTimes(1)
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback', {
            reason: 'outbound-stall',
            kinds: 'audio+video',
            seconds: 12,
        })
    })

    it('gives a late-joining participant the whole grace period before judging the stall', async () => {
        const room = makeRoom(() => 0)
        room.participants = new Map()
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        // waiting alone for longer than the grace period
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS + 4 * STATS_POLL_MS)
            await flush()
        })
        room.participants = new Map([['PA1', { state: 'connected' }]])
        // the grace period counts from here, not from the join
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS)
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()
        // a baseline poll and four flat ones after it, as from a normal join
        for (let i = 0; i < 4; i++) await onePoll()
        expect(room.disconnect).not.toHaveBeenCalled()
        await onePoll()
        expect(room.disconnect).toHaveBeenCalledTimes(1)
    })

    it('does not fall back while bytes keep flowing', async () => {
        let bytes = 0
        const room = makeRoom(() => (bytes += 1000))
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS + 8 * STATS_POLL_MS)
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()
        expect(connect).not.toHaveBeenCalled()
    })

    it('falls back at most once per call', async () => {
        const room = makeRoom()
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await act(async () => {
            room.emit('reconnecting', { code: 53405 })
            room.emit('reconnecting', { code: 53405 })
            jest.advanceTimersByTime(RECONNECT_WAIT_MS + DISCONNECTED_DELAY_MS)
            await flush()
        })
        expect(room.disconnect).toHaveBeenCalledTimes(1)
        expect(connect).toHaveBeenCalledTimes(1)
    })

    it('gives relay up, instead of rejoining again, when a relayed call stalls too', async () => {
        window.localStorage.setItem(FORCE_RELAY_KEY, 'true')
        const room = makeRoom()
        const connect = connectOk()
        const { result } = renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        expect(result.current.isRelayActive).toBe(true)
        await failMediaConnection(room)
        expect(room.disconnect).not.toHaveBeenCalled()
        expect(connect).not.toHaveBeenCalled()
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()
        expect(result.current.isRelayActive).toBe(false)
        expect(logSpy).toHaveBeenCalledWith(
            'room',
            'relay-fallback-failed',
            expect.objectContaining({ reason: 'media-connection-failed' })
        )
    })

    it('a later direct call on the same page starts from what the browser remembers, not from the last call', async () => {
        const room = makeRoom()
        const relayed = makeRoom(() => 0)
        relayed.sid = 'RM2'
        const connect = jest.fn(() => Promise.resolve(relayed))
        const { result, rerender } = renderHook(
            ({ current }) =>
                useRelayFallback(current, connect, { current: tok }, true),
            { initialProps: { current: room } }
        )
        await failMediaConnection(room)
        await act(async () => {
            jest.advanceTimersByTime(DISCONNECTED_DELAY_MS)
            await flush()
        })
        rerender({ current: relayed })
        expect(result.current.isRelayActive).toBe(true)
        // hung up before any relayed bytes flowed: nothing remembered
        rerender({ current: null })
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()

        // the next call starts direct, as useConnectionOptions would start it
        let bytes = 0
        const direct = makeRoom(() => (bytes += 500))
        direct.sid = 'RM3'
        rerender({ current: direct })
        expect(result.current.isRelayActive).toBe(false)
        await onePoll()
        await onePoll() // bytes moved on a direct call: that proves nothing about relay
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()
        expect(logSpy).not.toHaveBeenCalledWith(
            'room',
            'relay-fallback-remembered'
        )

        // and a failure on this direct call falls back, instead of giving relay up
        connect.mockClear()
        await failMediaConnection(direct)
        expect(direct.disconnect).toHaveBeenCalledTimes(1)
        await act(async () => {
            jest.advanceTimersByTime(DISCONNECTED_DELAY_MS)
            await flush()
        })
        expect(connect).toHaveBeenCalledWith(tok, relayOverrides)
        expect(logSpy).not.toHaveBeenCalledWith(
            'room',
            'relay-fallback-failed',
            expect.anything()
        )
    })

    it('does not remember relay when bytes start flowing only after the relayed call gave relay up', async () => {
        const room = makeRoom()
        let relayedBytes = 0
        // flat for the whole stall, then moving again
        const relayed = makeRoom(() => relayedBytes)
        relayed.sid = 'RM2'
        const connect = jest.fn(() => Promise.resolve(relayed))
        const { result, rerender } = renderHook(
            ({ current }) =>
                useRelayFallback(current, connect, { current: tok }, true),
            { initialProps: { current: room } }
        )
        await failMediaConnection(room)
        await act(async () => {
            jest.advanceTimersByTime(DISCONNECTED_DELAY_MS)
            await flush()
        })
        rerender({ current: relayed })
        // the relayed call stalls too: relay is given up
        await act(async () => {
            jest.advanceTimersByTime(START_GRACE_MS + 5 * STATS_POLL_MS)
            await flush()
        })
        expect(result.current.isRelayActive).toBe(false)
        expect(logSpy).toHaveBeenCalledWith(
            'room',
            'relay-fallback-failed',
            expect.objectContaining({ reason: 'outbound-stall' })
        )
        // bytes moving now prove nothing: the forget stands
        relayedBytes = 500
        await onePoll()
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()
        expect(logSpy).not.toHaveBeenCalledWith(
            'room',
            'relay-fallback-remembered'
        )
    })

    it('leaves a live call alone when the token could not complete the rejoin', async () => {
        const room = makeRoom()
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(
                room,
                connect,
                { current: jwtExpiringIn(30) },
                true
            )
        )
        await failMediaConnection(room)
        expect(room.disconnect).not.toHaveBeenCalled()
        expect(connect).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback-skipped', {
            reason: 'media-connection-failed',
            why: 'token expired',
        })
    })

    it('does not pin relay when the relayed rejoin itself fails', async () => {
        const room = makeRoom()
        const connect = jest.fn(() => Promise.resolve(null))
        const { result } = renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await failMediaConnection(room)
        await act(async () => {
            jest.advanceTimersByTime(DISCONNECTED_DELAY_MS)
            await flush()
        })
        expect(connect).toHaveBeenCalledWith(tok, relayOverrides)
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()
        expect(result.current.isRelayActive).toBe(false)
        expect(result.current.isReconnecting).toBe(false)
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback-failed', {
            reason: 'rejoin-failed',
        })
        expect(logSpy).not.toHaveBeenCalledWith(
            'room',
            'relay-fallback-connected'
        )
    })

    it('ignores other reconnect reasons and does nothing when disabled', async () => {
        const room = makeRoom()
        const connect = connectOk()
        renderHook(() =>
            useRelayFallback(room, connect, { current: tok }, true)
        )
        await act(async () => {
            room.emit('reconnecting', {
                code: 53001,
                message: 'Signaling connection disrupted',
            })
            jest.advanceTimersByTime(RECONNECT_WAIT_MS + 1)
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()

        const disabledRoom = makeRoom()
        renderHook(() =>
            useRelayFallback(disabledRoom, connect, { current: tok }, false)
        )
        await act(async () => {
            disabledRoom.emit('reconnecting', { code: 53405 })
            jest.advanceTimersByTime(
                RECONNECT_WAIT_MS + START_GRACE_MS + 6 * STATS_POLL_MS
            )
            await flush()
        })
        expect(disabledRoom.disconnect).not.toHaveBeenCalled()
    })
})

describe('outboundSamples', () => {
    it('samples only tracks that can currently send: enabled, live, unmuted, not screen share', () => {
        const room = makeRoom(() => 42)
        room.localParticipant.videoTracks.set('MTs', {
            trackSid: 'MTs',
            track: makeTrack('video', { name: 'screen' }),
        })
        room.localParticipant.audioTracks.get('MTa').track.isEnabled = false
        const reports = [
            {
                localAudioTrackStats: [{ trackSid: 'MTa', bytesSent: 42 }],
                localVideoTrackStats: [
                    { trackSid: 'MTv', bytesSent: 42 },
                    { trackSid: 'MTs', bytesSent: 42 },
                ],
            },
        ]
        expect(outboundSamples(room, reports as any)).toEqual([
            { kind: 'video', bytesSent: 42 },
        ])
        room.localParticipant.videoTracks.get(
            'MTv'
        ).track.mediaStreamTrack.muted = true
        expect(outboundSamples(room, reports as any)).toEqual([])
    })
})
