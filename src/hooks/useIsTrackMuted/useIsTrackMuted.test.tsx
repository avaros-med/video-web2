import { act, renderHook } from '@testing-library/react-hooks'
import { EventEmitter } from 'events'
import useIsTrackMuted from './useIsTrackMuted'

const mockTrack = (isEnabled: boolean) => {
    const track = new EventEmitter() as any
    track.isEnabled = isEnabled
    return track
}

describe('useIsTrackMuted', () => {
    it('is false without a track', () => {
        expect(
            renderHook(() => useIsTrackMuted(undefined)).result.current
        ).toBe(false)
        expect(renderHook(() => useIsTrackMuted(null)).result.current).toBe(
            false
        )
    })

    it('reflects the track and follows its enabled/disabled events', () => {
        const track = mockTrack(true)
        const { result } = renderHook(() => useIsTrackMuted(track))
        expect(result.current).toBe(false)

        act(() => {
            track.isEnabled = false
            track.emit('disabled')
        })
        expect(result.current).toBe(true)

        act(() => {
            track.isEnabled = true
            track.emit('enabled')
        })
        expect(result.current).toBe(false)
    })

    it('is not muted in the very render an unmuted track arrives', () => {
        const seen: boolean[] = []
        const { rerender } = renderHook(
            ({ track }) => {
                const muted = useIsTrackMuted(track)
                seen.push(muted)
                return muted
            },
            { initialProps: { track: undefined as any } }
        )
        rerender({ track: mockTrack(true) })
        expect(seen).not.toContain(true)
    })

    it('is muted at once when a muted track arrives', () => {
        const { result, rerender } = renderHook(
            ({ track }) => useIsTrackMuted(track),
            { initialProps: { track: undefined as any } }
        )
        rerender({ track: mockTrack(false) })
        expect(result.current).toBe(true)
    })
})
