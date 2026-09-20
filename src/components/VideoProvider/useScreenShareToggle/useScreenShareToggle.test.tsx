import { renderHook, act } from '@testing-library/react-hooks'
import { EventEmitter } from 'events'
import useScreenShareToggle, {
    SCREEN_SHARE_PUBLISH_FAILED_MESSAGE,
    SCREEN_SHARE_STOPPED_MEDIA_LOST_MESSAGE,
} from './useScreenShareToggle'
import { ErrorCallback } from '../../../types'
// @ts-ignore - exported by the manual mock in src/__mocks__/twilio-video.ts
import { MockLocalVideoTrack } from 'twilio-video'

const mockLocalParticipant = new EventEmitter() as any
mockLocalParticipant.publishTrack = jest.fn(() =>
    Promise.resolve('mockPublication')
)
mockLocalParticipant.unpublishTrack = jest.fn()

const mockRoom = new EventEmitter() as any
mockRoom.localParticipant = mockLocalParticipant

const mockOnError: jest.MockedFunction<ErrorCallback> = jest.fn()

const mockTrack: any = {
    stop: jest.fn(),
    getSettings: () => ({ displaySurface: 'monitor', width: 1920 }),
}

const mockMediaDevices = {
    value: {
        getDisplayMedia: jest.fn(() =>
            Promise.resolve({
                getVideoTracks: jest.fn(() => [mockTrack]),
            })
        ),
    } as any,
}

Object.defineProperty(navigator, 'mediaDevices', mockMediaDevices)

const publishedTrack = () =>
    mockLocalParticipant.publishTrack.mock.calls[0][0] as MockLocalVideoTrack

describe('the useScreenShareToggle hook', () => {
    beforeEach(() => {
        delete mockTrack.onended
        jest.clearAllMocks()
        mockLocalParticipant.publishTrack.mockImplementation(() =>
            Promise.resolve('mockPublication')
        )
    })

    it('should return a default value of false and no notice', () => {
        const { result } = renderHook(() =>
            useScreenShareToggle(mockRoom, mockOnError)
        )
        expect(result.current).toEqual([
            false,
            expect.any(Function),
            null,
            expect.any(Function),
        ])
    })

    describe('toggle function', () => {
        it('should wrap the display track in a LocalVideoTrack named "screen" and publish it with low priority', async () => {
            const { result, waitForNextUpdate } = renderHook(() =>
                useScreenShareToggle(mockRoom, mockOnError)
            )
            result.current[1]()
            await waitForNextUpdate()
            expect(
                navigator.mediaDevices.getDisplayMedia
            ).toHaveBeenCalledWith({ audio: false, video: true })
            const track = publishedTrack()
            expect(track).toBeInstanceOf(MockLocalVideoTrack)
            expect(track.name).toBe('screen')
            expect(track.mediaStreamTrack).toBe(mockTrack)
            expect(
                mockLocalParticipant.publishTrack
            ).toHaveBeenCalledWith(track, { priority: 'low' })
            expect(result.current[0]).toEqual(true)
        })

        it('should not toggle screen sharing when there is no room', async () => {
            const { result } = renderHook(() =>
                useScreenShareToggle(null, mockOnError)
            )
            result.current[1]()
            expect(
                navigator.mediaDevices.getDisplayMedia
            ).not.toHaveBeenCalled()
            expect(mockLocalParticipant.publishTrack).not.toHaveBeenCalled()
        })

        it('should correctly stop screen sharing when isSharing is true', async () => {
            const localParticipantSpy = jest.spyOn(mockLocalParticipant, 'emit')
            const { result, waitForNextUpdate } = renderHook(() =>
                useScreenShareToggle(mockRoom, mockOnError)
            )
            expect(mockTrack.onended).toBeUndefined()
            result.current[1]()
            await waitForNextUpdate()
            expect(result.current[0]).toEqual(true)
            const track = publishedTrack()
            act(() => {
                result.current[1]()
            })
            expect(mockLocalParticipant.unpublishTrack).toHaveBeenCalledWith(
                track
            )
            expect(localParticipantSpy).toHaveBeenCalledWith(
                'trackUnpublished',
                'mockPublication'
            )
            expect(track.stop).toHaveBeenCalled()
            expect(mockTrack.stop).toHaveBeenCalled()
            expect(result.current[0]).toEqual(false)
        })

        it('should release the capture, keep isSharing false and report a friendly error when publishing fails', async () => {
            mockLocalParticipant.publishTrack.mockImplementation(() =>
                Promise.reject(
                    Object.assign(new Error('renegotiation failed'), {
                        code: 53405,
                    })
                )
            )
            const { result } = renderHook(() =>
                useScreenShareToggle(mockRoom, mockOnError)
            )
            await act(async () => {
                result.current[1]()
                // let the getDisplayMedia and publishTrack promises settle
                await Promise.resolve()
                await Promise.resolve()
                await Promise.resolve()
            })
            expect(mockTrack.stop).toHaveBeenCalled()
            expect(result.current[0]).toEqual(false)
            expect(mockOnError).toHaveBeenCalledTimes(1)
            const error = mockOnError.mock.calls[0][0]
            expect(error.message).toBe(SCREEN_SHARE_PUBLISH_FAILED_MESSAGE)
            expect(error.code).toBe(53405)
        })

        it('should stop sharing and set a notice when the media connection is lost while sharing', async () => {
            const { result, waitForNextUpdate } = renderHook(() =>
                useScreenShareToggle(mockRoom, mockOnError)
            )
            result.current[1]()
            await waitForNextUpdate()
            const track = publishedTrack()

            // A signalling-only reconnect should not stop the share.
            act(() => {
                mockRoom.emit('reconnecting', { code: 53001 })
            })
            expect(result.current[0]).toEqual(true)
            expect(result.current[2]).toBeNull()

            act(() => {
                mockRoom.emit('reconnecting', { code: 53405 })
            })
            expect(mockLocalParticipant.unpublishTrack).toHaveBeenCalledWith(
                track
            )
            expect(result.current[0]).toEqual(false)
            expect(result.current[2]).toEqual({
                message: SCREEN_SHARE_STOPPED_MEDIA_LOST_MESSAGE,
            })

            act(() => {
                result.current[3]()
            })
            expect(result.current[2]).toBeNull()
        })

        describe('onended function', () => {
            it('should correctly stop screen sharing when called', async () => {
                const localParticipantSpy = jest.spyOn(
                    mockLocalParticipant,
                    'emit'
                )
                const { result, waitForNextUpdate } = renderHook(() =>
                    useScreenShareToggle(mockRoom, mockOnError)
                )
                expect(mockTrack.onended).toBeUndefined()
                result.current[1]()
                await waitForNextUpdate()
                expect(mockTrack.onended).toEqual(expect.any(Function))
                const track = publishedTrack()
                act(() => {
                    mockTrack.onended()
                })
                expect(
                    mockLocalParticipant.unpublishTrack
                ).toHaveBeenCalledWith(track)
                expect(localParticipantSpy).toHaveBeenCalledWith(
                    'trackUnpublished',
                    'mockPublication'
                )
                expect(mockTrack.stop).toHaveBeenCalled()
                expect(result.current[0]).toEqual(false)
            })
        })
    })
})
