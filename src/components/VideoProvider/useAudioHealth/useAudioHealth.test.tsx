import { act, renderHook } from '@testing-library/react-hooks'
import { EventEmitter } from 'events'
import useAudioHealth from './useAudioHealth'
import { subscribeToAudioLevel } from '../../ParticipantInfo/audioLevelStore'
import { SELECTED_AUDIO_INPUT_KEY } from '../../../constants'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'

jest.mock('../../ParticipantInfo/audioLevelStore')
jest.mock('../../../services/diagnostics/diagnostics.service', () => ({
    diagnosticsService: { log: jest.fn() },
}))

const mockSubscribeToAudioLevel = subscribeToAudioLevel as jest.Mock
let levelSubscriber: ((sample: any) => void) | undefined
mockSubscribeToAudioLevel.mockImplementation((_track, subscriber) => {
    levelSubscriber = subscriber
    return () => {
        levelSubscriber = undefined
    }
})

class MockMediaStreamTrack extends EventTarget {
    label = 'Built-in Microphone'
    muted = false
    readyState = 'live'
}

class MockLocalAudioTrack extends EventEmitter {
    kind = 'audio'
    isEnabled = true
    mediaStreamTrack = new MockMediaStreamTrack()
    restart = jest.fn(() => Promise.resolve())
}

const makeRoom = () => {
    const room = new EventEmitter() as any
    room.state = 'connected'
    room.getStats = jest.fn(() => Promise.resolve([]))
    room.localParticipant = { audioTracks: new Map() }
    room.participants = new Map()
    return room
}

const SILENCE_MS = 11000

describe('the useAudioHealth hook', () => {
    let audioTrack: MockLocalAudioTrack
    let room: any

    beforeEach(() => {
        jest.clearAllMocks()
        window.localStorage.clear()
        audioTrack = new MockLocalAudioTrack()
        room = makeRoom()
    })

    it('should report ok with no alert by default', () => {
        const { result } = renderHook(() =>
            useAudioHealth(room, [audioTrack as any])
        )
        expect(result.current.micStatus).toBe('ok')
        expect(result.current.isMicAlertVisible).toBe(false)
        expect(result.current.remoteAudioAlert).toBeNull()
    })

    it('should flag a system-muted microphone and clear it on unmute', () => {
        const { result } = renderHook(() =>
            useAudioHealth(room, [audioTrack as any])
        )
        act(() => {
            audioTrack.mediaStreamTrack.dispatchEvent(new Event('mute'))
        })
        expect(result.current.micStatus).toBe('system-muted')
        expect(result.current.isMicAlertVisible).toBe(true)

        act(() => {
            result.current.dismissMicAlert()
        })
        expect(result.current.isMicAlertVisible).toBe(false)
        expect(result.current.micStatus).toBe('system-muted')

        act(() => {
            audioTrack.mediaStreamTrack.dispatchEvent(new Event('unmute'))
        })
        expect(result.current.micStatus).toBe('ok')
    })

    it('should flag an ended microphone track', () => {
        const { result } = renderHook(() =>
            useAudioHealth(room, [audioTrack as any])
        )
        act(() => {
            audioTrack.mediaStreamTrack.dispatchEvent(new Event('ended'))
        })
        expect(result.current.micStatus).toBe('ended')
    })

    it('should flag sustained digital silence and recover when sound returns', () => {
        const now = jest.spyOn(Date, 'now')
        const { result } = renderHook(() =>
            useAudioHealth(room, [audioTrack as any])
        )
        expect(mockSubscribeToAudioLevel).toHaveBeenCalledWith(
            audioTrack.mediaStreamTrack,
            expect.any(Function)
        )

        now.mockReturnValue(1000)
        act(() => levelSubscriber!({ volume: 0, isSilent: true }))
        now.mockReturnValue(5000)
        act(() => levelSubscriber!({ volume: 0, isSilent: true }))
        expect(result.current.micStatus).toBe('ok')

        now.mockReturnValue(12000)
        act(() => levelSubscriber!({ volume: 0, isSilent: true }))
        expect(result.current.micStatus).toBe('silent')
        expect(result.current.isMicAlertVisible).toBe(true)

        act(() => levelSubscriber!({ volume: 3, isSilent: false }))
        expect(result.current.micStatus).toBe('ok')
        expect(result.current.isMicAlertVisible).toBe(false)
        now.mockRestore()
    })

    it('should not monitor silence when the user has muted themselves', () => {
        audioTrack.isEnabled = false
        renderHook(() => useAudioHealth(room, [audioTrack as any]))
        expect(mockSubscribeToAudioLevel).not.toHaveBeenCalled()
    })

    describe('restartMic', () => {
        it('should restart with the selected device and reset the status', async () => {
            window.localStorage.setItem(SELECTED_AUDIO_INPUT_KEY, 'usb-mic')
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            act(() => {
                audioTrack.mediaStreamTrack.dispatchEvent(new Event('mute'))
            })
            expect(result.current.micStatus).toBe('system-muted')

            await act(() => result.current.restartMic())
            expect(audioTrack.restart).toHaveBeenCalledWith({
                deviceId: { exact: 'usb-mic' },
            })
            expect(result.current.micStatus).toBe('ok')
        })

        it('should fall back to the default device when the selected one fails', async () => {
            window.localStorage.setItem(SELECTED_AUDIO_INPUT_KEY, 'gone-mic')
            audioTrack.restart
                .mockImplementationOnce(() => Promise.reject(new Error('nope')))
                .mockImplementationOnce(() => Promise.resolve())
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await act(() => result.current.restartMic())
            expect(audioTrack.restart).toHaveBeenNthCalledWith(1, {
                deviceId: { exact: 'gone-mic' },
            })
            expect(audioTrack.restart).toHaveBeenNthCalledWith(2, {})
        })
    })

    describe('peer connection byte counters', () => {
        beforeEach(() => {
            jest.useFakeTimers()
        })
        afterEach(() => {
            jest.useRealTimers()
        })

        const flushPoll = async () => {
            await act(async () => {
                jest.advanceTimersByTime(3000)
                await Promise.resolve()
                await Promise.resolve()
            })
        }

        let remoteBytesReceived = 4000

        // Puts a remote participant in the room whose audio byte counter only
        // moves when the test moves it.
        const givenRemoteParticipant = () => {
            remoteBytesReceived = 4000
            room.participants.set('PA1', {
                identity: 'Patient',
                audioTracks: new Map([
                    [
                        'MTremote',
                        { trackSid: 'MTremote', track: { isEnabled: true } },
                    ],
                ]),
            })
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [],
                        remoteAudioTrackStats: [
                            {
                                trackSid: 'MTremote',
                                bytesReceived: remoteBytesReceived,
                            },
                        ],
                    },
                ])
            )
        }

        // One baseline poll plus the three stalled polls that raise the alert.
        const stallRemoteAudio = async (result: any) => {
            await flushPoll()
            await flushPoll()
            await flushPoll()
            await flushPoll()
            expect(result.current.remoteAudioAlert).not.toBeNull()
        }

        it('should flag a local track that stops sending bytes and recover when they flow again', async () => {
            room.localParticipant.audioTracks.set('MTlocal', {
                trackSid: 'MTlocal',
                track: audioTrack,
            })
            let bytesSent = 1000
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [
                            { trackSid: 'MTlocal', bytesSent },
                        ],
                        remoteAudioTrackStats: [],
                    },
                ])
            )
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )

            await flushPoll() // baseline
            bytesSent += 500
            await flushPoll() // still increasing
            expect(result.current.micStatus).toBe('ok')

            await flushPoll() // stalled 1
            await flushPoll() // stalled 2
            expect(result.current.micStatus).toBe('ok')
            await flushPoll() // stalled 3 -> alert
            expect(result.current.micStatus).toBe('not-sending')

            bytesSent += 500
            await flushPoll()
            expect(result.current.micStatus).toBe('ok')
        })

        it('should raise not-sending once a competing status clears while bytes stay stalled', async () => {
            room.localParticipant.audioTracks.set('MTlocal', {
                trackSid: 'MTlocal',
                track: audioTrack,
            })
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [
                            { trackSid: 'MTlocal', bytesSent: 1000 },
                        ],
                        remoteAudioTrackStats: [],
                    },
                ])
            )
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )

            // Digital silence claims the status first. Silence uses Date.now().
            let now = 1_000_000
            jest.spyOn(Date, 'now').mockImplementation(() => now)
            act(() => levelSubscriber?.({ volume: 0, isSilent: true }))
            now += SILENCE_MS
            act(() => levelSubscriber?.({ volume: 0, isSilent: true }))
            expect(result.current.micStatus).toBe('silent')

            // Bytes stall for the whole threshold while 'silent' owns the status.
            await flushPoll()
            await flushPoll()
            await flushPoll()
            await flushPoll()

            // Sound returns, so silence clears — but nothing is reaching the room.
            act(() => levelSubscriber?.({ volume: 5, isSilent: false }))
            await flushPoll()
            expect(result.current.micStatus).toBe('not-sending')
        })

        const recoveredFromNotSending = () =>
            (diagnosticsService.log as jest.Mock).mock.calls.filter(
                ([category, name, data]) =>
                    category === 'mic' &&
                    name === 'recovered' &&
                    data?.from === 'not-sending'
            ).length

        const givenStalledLocalAudio = () => {
            room.localParticipant.audioTracks.set('MTlocal', {
                trackSid: 'MTlocal',
                track: audioTrack,
            })
            const counter = { bytesSent: 1000 }
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [
                            {
                                trackSid: 'MTlocal',
                                bytesSent: counter.bytesSent,
                            },
                        ],
                        remoteAudioTrackStats: [],
                    },
                ])
            )
            return counter
        }

        it('should fall back to not-sending rather than ok when a system mute lifts while bytes are still stalled', async () => {
            const counter = givenStalledLocalAudio()
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await flushPoll()
            await flushPoll()
            await flushPoll()
            await flushPoll()
            expect(result.current.micStatus).toBe('not-sending')

            // The OS pauses the device, then hands it back. The renegotiation
            // fault that stopped bytes leaving has not gone anywhere.
            audioTrack.mediaStreamTrack.muted = true
            act(() => {
                audioTrack.mediaStreamTrack.dispatchEvent(new Event('mute'))
            })
            expect(result.current.micStatus).toBe('system-muted')
            await flushPoll()
            audioTrack.mediaStreamTrack.muted = false
            act(() => {
                audioTrack.mediaStreamTrack.dispatchEvent(new Event('unmute'))
            })
            expect(result.current.micStatus).toBe('not-sending')
            expect(recoveredFromNotSending()).toBe(0)

            // Only bytes actually flowing again count as the recovery.
            counter.bytesSent += 5000
            await flushPoll()
            expect(result.current.micStatus).toBe('ok')
            expect(recoveredFromNotSending()).toBe(1)
        })

        it('should not log a not-sending recovery just because the microphone was muted', async () => {
            const counter = givenStalledLocalAudio()
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await flushPoll()
            await flushPoll()
            await flushPoll()
            await flushPoll()
            expect(result.current.micStatus).toBe('not-sending')

            audioTrack.isEnabled = false
            await flushPoll()
            expect(result.current.micStatus).toBe('ok')
            expect(recoveredFromNotSending()).toBe(0)

            audioTrack.isEnabled = true
            counter.bytesSent += 5000
            await flushPoll()
            expect(recoveredFromNotSending()).toBe(1)
        })

        it('should clear the not-sending alert after a mute and unmute cycle', async () => {
            room.localParticipant.audioTracks.set('MTlocal', {
                trackSid: 'MTlocal',
                track: audioTrack,
            })
            let bytesSent = 1000
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [
                            { trackSid: 'MTlocal', bytesSent },
                        ],
                        remoteAudioTrackStats: [],
                    },
                ])
            )
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )

            await flushPoll() // baseline
            await flushPoll()
            await flushPoll()
            await flushPoll() // stalled 3 -> alert
            expect(result.current.micStatus).toBe('not-sending')

            // Toggling mute is the first thing anyone tries when told nobody can
            // hear them, and it resets the stall counter. Recovery must not depend
            // on that counter or the alert can never clear.
            audioTrack.isEnabled = false
            await flushPoll()
            audioTrack.isEnabled = true
            bytesSent += 5000
            await flushPoll()

            expect(result.current.micStatus).toBe('ok')
        })

        it('should report a remote participant whose audio stops arriving', async () => {
            room.participants.set('PA1', {
                identity: 'Patient',
                audioTracks: new Map([
                    [
                        'MTremote',
                        { trackSid: 'MTremote', track: { isEnabled: true } },
                    ],
                ]),
            })
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [],
                        remoteAudioTrackStats: [
                            { trackSid: 'MTremote', bytesReceived: 4000 },
                        ],
                    },
                ])
            )
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await flushPoll() // baseline
            await flushPoll()
            await flushPoll()
            expect(result.current.remoteAudioAlert).toBeNull()
            await flushPoll()
            expect(result.current.remoteAudioAlert).toEqual({
                identity: 'Patient',
                trackSid: 'MTremote',
            })

            // Dismissing puts the callout away; the problem, and the tile badge
            // driven by it, remain until the audio actually recovers.
            act(() => result.current.dismissRemoteAudioAlert())
            expect(result.current.isRemoteAlertVisible).toBe(false)
            expect(result.current.remoteAudioAlert).toEqual({
                identity: 'Patient',
                trackSid: 'MTremote',
            })
        })

        it('should not let a second stalled participant replace an active alert', async () => {
            givenRemoteParticipant()
            room.participants.set('PA2', {
                identity: 'Guest',
                audioTracks: new Map([
                    [
                        'MTguest',
                        { trackSid: 'MTguest', track: { isEnabled: true } },
                    ],
                ]),
            })
            let guestBytes = 9000
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [],
                        remoteAudioTrackStats: [
                            { trackSid: 'MTremote', bytesReceived: 4000 },
                            { trackSid: 'MTguest', bytesReceived: guestBytes },
                        ],
                    },
                ])
            )
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )

            // The patient stalls first and owns the alert.
            guestBytes += 500
            await flushPoll()
            guestBytes += 500
            await flushPoll()
            guestBytes += 500
            await flushPoll()
            guestBytes += 500
            await flushPoll()
            expect(result.current.remoteAudioAlert?.identity).toBe('Patient')

            // Now the guest stalls too. The patient is still silent, so the alert
            // must stay on them rather than being quietly overwritten.
            await flushPoll()
            await flushPoll()
            await flushPoll()
            await flushPoll()
            expect(result.current.remoteAudioAlert?.identity).toBe('Patient')
        })

        it('should not re-raise an alert that was dismissed while the track is still stalled', async () => {
            givenRemoteParticipant()
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await stallRemoteAudio(result)

            // Dismissing (by the control or by the auto-hide timeout) has to stick
            // for as long as the track stays stalled, or the callout reappears on
            // the very next poll three seconds later.
            act(() => result.current.dismissRemoteAudioAlert())
            expect(result.current.isRemoteAlertVisible).toBe(false)
            await flushPoll()
            await flushPoll()
            expect(result.current.isRemoteAlertVisible).toBe(false)
        })

        it('should alert again when a dismissed participant republishes their audio', async () => {
            givenRemoteParticipant()
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await stallRemoteAudio(result)
            act(() => result.current.dismissRemoteAudioAlert())

            // Same participant, new publication. The dismissal belonged to the old
            // track, so the new one must be able to raise its own alert.
            room.participants.set('PA1', {
                identity: 'Patient',
                audioTracks: new Map([
                    [
                        'MTremote2',
                        { trackSid: 'MTremote2', track: { isEnabled: true } },
                    ],
                ]),
            })
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [],
                        remoteAudioTrackStats: [
                            { trackSid: 'MTremote2', bytesReceived: 7000 },
                        ],
                    },
                ])
            )
            await stallRemoteAudio(result)
            expect(result.current.remoteAudioAlert).toEqual({
                identity: 'Patient',
                trackSid: 'MTremote2',
            })
            expect(result.current.isRemoteAlertVisible).toBe(true)
        })

        it('should show the callout again when the same track stalls after recovering', async () => {
            givenRemoteParticipant()
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await stallRemoteAudio(result)
            act(() => result.current.dismissRemoteAudioAlert())
            expect(result.current.isRemoteAlertVisible).toBe(false)

            // Recovery clears the problem and, with it, the memory of the dismissal.
            remoteBytesReceived += 500
            await flushPoll()
            expect(result.current.remoteAudioAlert).toBeNull()

            // A fresh stall is a fresh problem and gets a fresh callout.
            await stallRemoteAudio(result)
            expect(result.current.isRemoteAlertVisible).toBe(true)
        })

        it('should keep the microphone problem while its callout is dismissed and bring it back on request', async () => {
            room.localParticipant.audioTracks.set('MTlocal', {
                trackSid: 'MTlocal',
                track: audioTrack,
            })
            let bytesSent = 1000
            room.getStats.mockImplementation(() =>
                Promise.resolve([
                    {
                        localAudioTrackStats: [
                            { trackSid: 'MTlocal', bytesSent },
                        ],
                        remoteAudioTrackStats: [],
                    },
                ])
            )
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await flushPoll()
            await flushPoll()
            await flushPoll()
            await flushPoll()
            expect(result.current.micStatus).toBe('not-sending')
            expect(result.current.isMicAlertVisible).toBe(true)

            // The callout carries the only reconnect action, so dismissing it must
            // not erase the problem, and the pulsing button must be able to bring
            // the callout back.
            act(() => result.current.dismissMicAlert())
            expect(result.current.isMicAlertVisible).toBe(false)
            expect(result.current.micStatus).toBe('not-sending')
            await flushPoll()
            expect(result.current.isMicAlertVisible).toBe(false)
            act(() => result.current.showMicAlert())
            expect(result.current.isMicAlertVisible).toBe(true)

            // Once it recovers, the dismissal is forgotten: a later recurrence is
            // shown without anyone having to ask for it.
            act(() => result.current.dismissMicAlert())
            bytesSent += 5000
            await flushPoll()
            expect(result.current.micStatus).toBe('ok')
            await flushPoll()
            await flushPoll()
            await flushPoll()
            expect(result.current.micStatus).toBe('not-sending')
            expect(result.current.isMicAlertVisible).toBe(true)
        })

        it('should clear the alert when the track it refers to goes away', async () => {
            givenRemoteParticipant()
            const { result } = renderHook(() =>
                useAudioHealth(room, [audioTrack as any])
            )
            await stallRemoteAudio(result)

            // The participant leaves, so there is nobody left to not be hearing.
            room.participants.clear()
            await flushPoll()
            expect(result.current.remoteAudioAlert).toBeNull()
        })
    })
})
