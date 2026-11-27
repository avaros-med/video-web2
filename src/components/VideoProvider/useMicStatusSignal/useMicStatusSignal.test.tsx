import { act, renderHook } from '@testing-library/react-hooks'
import { EventEmitter } from 'events'
import useMicStatusSignal, {
    decodeMicStatus,
    encodeMicStatus,
    MIC_STATUS_HEARTBEAT_MS,
    MIC_STATUS_TRACK_NAME,
    toSignalledStatus,
} from './useMicStatusSignal'

const mockSend = jest.fn()
jest.mock('twilio-video', () => ({
    LocalDataTrack: function(this: any, options: { name: string }) {
        this.name = options.name
        this.send = (data: string) => mockSend(data)
    },
}))

const track = { name: MIC_STATUS_TRACK_NAME }
const patient = { identity: 'Patient_1' }
const report = (status: string) =>
    JSON.stringify({ type: 'mic-status', status })

describe('mic status messages', () => {
    it('signals device problems and treats a quiet microphone as ok', () => {
        expect(toSignalledStatus('system-muted')).toBe('system-muted')
        expect(toSignalledStatus('ended')).toBe('ended')
        expect(toSignalledStatus('not-sending')).toBe('not-sending')
        expect(toSignalledStatus('silent')).toBe('ok')
        expect(toSignalledStatus('ok')).toBe('ok')
    })

    it('round-trips and rejects anything else', () => {
        expect(decodeMicStatus(encodeMicStatus('system-muted'))).toBe(
            'system-muted'
        )
        expect(decodeMicStatus(encodeMicStatus('silent'))).toBe('ok')
        expect(decodeMicStatus('not json')).toBeNull()
        expect(decodeMicStatus(report('exploded'))).toBeNull()
        expect(decodeMicStatus(JSON.stringify({ type: 'chat' }))).toBeNull()
        expect(decodeMicStatus(new ArrayBuffer(2))).toBeNull()
    })
})

describe('useMicStatusSignal', () => {
    let room: any
    let now = 0

    beforeEach(() => {
        jest.useFakeTimers()
        // These fake timers do not move Date.now, which the stale-report sweep reads.
        now = 1000000
        jest.spyOn(Date, 'now').mockImplementation(() => now)
        mockSend.mockClear()
        room = new EventEmitter()
    })
    afterEach(() => {
        jest.restoreAllMocks()
        jest.useRealTimers()
    })
    const advance = (ms: number) => {
        now += ms
        jest.advanceTimersByTime(ms)
    }

    it('reports its own status on join, on every beat and at once on a change', () => {
        const { rerender, unmount } = renderHook(
            ({ status }) => useMicStatusSignal(room, status),
            { initialProps: { status: 'ok' as any } }
        )
        expect(mockSend).toHaveBeenLastCalledWith(report('ok'))

        mockSend.mockClear()
        act(() => {
            advance(MIC_STATUS_HEARTBEAT_MS)
        })
        expect(mockSend).toHaveBeenCalledTimes(1)

        mockSend.mockClear()
        rerender({ status: 'system-muted' })
        expect(mockSend).toHaveBeenLastCalledWith(report('system-muted'))

        // Leaving the room stops the heartbeat.
        unmount()
        mockSend.mockClear()
        advance(MIC_STATUS_HEARTBEAT_MS * 2)
        expect(mockSend).not.toHaveBeenCalled()
    })

    it('sends nothing without a room', () => {
        renderHook(() => useMicStatusSignal(null, 'system-muted'))
        advance(MIC_STATUS_HEARTBEAT_MS * 2)
        expect(mockSend).not.toHaveBeenCalled()
    })

    it('records a reported problem and clears it when the participant recovers', () => {
        const { result } = renderHook(() => useMicStatusSignal(room, 'ok'))
        expect(result.current).toEqual({})

        act(() => {
            room.emit('trackMessage', report('system-muted'), track, patient)
        })
        expect(result.current).toEqual({ Patient_1: 'system-muted' })

        act(() => {
            room.emit('trackMessage', report('ok'), track, patient)
        })
        expect(result.current).toEqual({})
    })

    it('ignores other data tracks and malformed messages', () => {
        const { result } = renderHook(() => useMicStatusSignal(room, 'ok'))
        act(() => {
            room.emit(
                'trackMessage',
                report('system-muted'),
                { name: 'chat' },
                patient
            )
            room.emit('trackMessage', 'garbage', track, patient)
        })
        expect(result.current).toEqual({})
    })

    it('drops a report when the participant leaves', () => {
        const { result } = renderHook(() => useMicStatusSignal(room, 'ok'))
        act(() => {
            room.emit('trackMessage', report('ended'), track, patient)
        })
        act(() => {
            room.emit('participantDisconnected', patient)
        })
        expect(result.current).toEqual({})
    })

    it('keeps a report through silence: a phone on a call may suspend the page', () => {
        const { result } = renderHook(() => useMicStatusSignal(room, 'ok'))
        act(() => {
            room.emit('trackMessage', report('system-muted'), track, patient)
        })
        act(() => {
            advance(5 * 60 * 1000)
        })
        expect(result.current).toEqual({ Patient_1: 'system-muted' })

        act(() => {
            room.emit('trackMessage', report('ok'), track, patient)
        })
        expect(result.current).toEqual({})
    })

    it('forgets every report when the room is left', () => {
        const { result, rerender } = renderHook(
            ({ r }) => useMicStatusSignal(r, 'ok'),
            { initialProps: { r: room as any } }
        )
        act(() => {
            room.emit('trackMessage', report('system-muted'), track, patient)
        })
        rerender({ r: null })
        expect(result.current).toEqual({})
    })
})
