import { act, renderHook } from '@testing-library/react-hooks'
import EventEmitter from 'events'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'
import { FORCE_RELAY_KEY } from '../../../constants'
import useRelayFallback, {
    isRelayReconnectInProgress,
    outboundSamples,
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
    // twilio-video emits 'disconnected' asynchronously after disconnect()
    room.disconnect = jest.fn(() => {
        setTimeout(() => room.emit('disconnected', room), 0)
    })
    return room
}

const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('the useRelayFallback hook', () => {
    let logSpy: jest.SpyInstance
    beforeEach(() => {
        window.localStorage.clear()
        jest.useFakeTimers()
        logSpy = jest
            .spyOn(diagnosticsService, 'log')
            .mockImplementation(() => ({} as any))
    })
    afterEach(() => {
        logSpy.mockRestore()
        jest.useRealTimers()
    })

    it('moves the call to relay when the SDK reports a media connection failure', async () => {
        const room = makeRoom()
        const connect = jest.fn(() => Promise.resolve())
        const tokenRef = { current: 'tok' }
        const { result } = renderHook(() =>
            useRelayFallback(room, connect, tokenRef, true)
        )

        await act(async () => {
            room.emit('reconnecting', {
                code: 53405,
                message: 'Media connection failed',
            })
            await flush()
        })
        expect(room.disconnect).toHaveBeenCalledTimes(1)
        expect(isRelayReconnectInProgress()).toBe(true)
        expect(result.current.isReconnecting).toBe(true)

        await act(async () => {
            jest.advanceTimersByTime(1) // the mocked 'disconnected'
            await flush()
        })
        expect(connect).toHaveBeenCalledWith('tok', {
            rtcConfiguration: { iceTransportPolicy: 'relay' },
        })
        expect(isRelayReconnectInProgress()).toBe(false)
        expect(result.current.isReconnecting).toBe(false)
        expect(result.current.isRelayActive).toBe(true)
        expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBe('true')
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback', {
            reason: 'media-connection-failed',
            code: 53405,
            message: 'Media connection failed',
        })
        expect(logSpy).toHaveBeenCalledWith('room', 'relay-fallback-connected')
    })

    it('moves the call to relay when no bytes leave the live, unmuted tracks after the grace period', async () => {
        const room = makeRoom(() => 0)
        const connect = jest.fn(() => Promise.resolve())
        renderHook(() =>
            useRelayFallback(room, connect, { current: 'tok' }, true)
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

    it('does not fall back while bytes keep flowing', async () => {
        let bytes = 0
        const room = makeRoom(() => (bytes += 1000))
        const connect = jest.fn(() => Promise.resolve())
        renderHook(() =>
            useRelayFallback(room, connect, { current: 'tok' }, true)
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
        const connect = jest.fn(() => Promise.resolve())
        renderHook(() =>
            useRelayFallback(room, connect, { current: 'tok' }, true)
        )
        await act(async () => {
            room.emit('reconnecting', { code: 53405 })
            room.emit('reconnecting', { code: 53405 })
            jest.advanceTimersByTime(1)
            await flush()
        })
        expect(room.disconnect).toHaveBeenCalledTimes(1)
        expect(connect).toHaveBeenCalledTimes(1)
    })

    it('gives relay up, instead of rejoining again, when a relayed call stalls too', async () => {
        window.localStorage.setItem(FORCE_RELAY_KEY, 'true')
        const room = makeRoom()
        const connect = jest.fn(() => Promise.resolve())
        const { result } = renderHook(() =>
            useRelayFallback(room, connect, { current: 'tok' }, true)
        )
        expect(result.current.isRelayActive).toBe(true)
        await act(async () => {
            room.emit('reconnecting', { code: 53405 })
            await flush()
        })
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

    it('ignores other reconnect reasons and does nothing when disabled', async () => {
        const room = makeRoom()
        const connect = jest.fn(() => Promise.resolve())
        renderHook(() =>
            useRelayFallback(room, connect, { current: 'tok' }, true)
        )
        await act(async () => {
            room.emit('reconnecting', {
                code: 53001,
                message: 'Signaling connection disrupted',
            })
            await flush()
        })
        expect(room.disconnect).not.toHaveBeenCalled()

        const disabledRoom = makeRoom()
        renderHook(() =>
            useRelayFallback(disabledRoom, connect, { current: 'tok' }, false)
        )
        await act(async () => {
            disabledRoom.emit('reconnecting', { code: 53405 })
            jest.advanceTimersByTime(START_GRACE_MS + 6 * STATS_POLL_MS)
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
