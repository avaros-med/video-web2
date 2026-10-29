import { Settings } from '../../state/settings/settingsReducer'
import { useAppState } from '../../state'
import useConnectionOptions from './useConnectionOptions'
import { FORCE_RELAY_KEY } from '../../constants'

const mockUseAppState = useAppState as jest.Mock<any>
jest.mock('../../state')

describe('the useConnectionOptions function', () => {
    it('should remove any undefined values from settings', () => {
        const settings: Settings = {
            trackSwitchOffMode: undefined,
            dominantSpeakerPriority: undefined,
            bandwidthProfileMode: undefined,
            maxAudioBitrate: '',
            clientTrackSwitchOffControl: 'manual',
            contentPreferencesMode: 'auto',
        }

        const result = {
            bandwidthProfile: {
                video: {
                    clientTrackSwitchOffControl: 'manual',
                    contentPreferencesMode: 'auto',
                },
            },
            dominantSpeaker: true,
            maxAudioBitrate: 0,
            networkQuality: { local: 1, remote: 1 },
            preferredVideoCodecs: 'auto',
        }

        mockUseAppState.mockImplementationOnce(() => ({ settings }))
        expect(useConnectionOptions()).toEqual(result)
    })

    it('should correctly generate settings', () => {
        const settings: Settings = {
            trackSwitchOffMode: 'detected',
            dominantSpeakerPriority: 'high',
            bandwidthProfileMode: 'collaboration',
            maxAudioBitrate: '0',
            contentPreferencesMode: 'auto',
            clientTrackSwitchOffControl: 'manual',
        }

        const result = {
            bandwidthProfile: {
                video: {
                    dominantSpeakerPriority: 'high',
                    mode: 'collaboration',
                    trackSwitchOffMode: 'detected',
                    contentPreferencesMode: 'auto',
                    clientTrackSwitchOffControl: 'manual',
                },
            },
            dominantSpeaker: true,
            maxAudioBitrate: 0,
            networkQuality: { local: 1, remote: 1 },
            preferredVideoCodecs: 'auto',
        }

        mockUseAppState.mockImplementationOnce(() => ({ settings }))
        expect(useConnectionOptions()).toEqual(result)
    })

    describe('relay fallback memory', () => {
        const settings: Settings = {
            trackSwitchOffMode: undefined,
            dominantSpeakerPriority: undefined,
            bandwidthProfileMode: undefined,
            maxAudioBitrate: '',
            clientTrackSwitchOffControl: 'manual',
            contentPreferencesMode: 'auto',
        }
        const originalFlag = process.env.REACT_APP_AUTO_RELAY_FALLBACK
        beforeEach(() => window.localStorage.clear())
        afterEach(() => {
            process.env.REACT_APP_AUTO_RELAY_FALLBACK = originalFlag
        })

        it('starts relayed on a browser that once needed the relay fallback', () => {
            window.localStorage.setItem(FORCE_RELAY_KEY, 'true')
            mockUseAppState.mockImplementationOnce(() => ({ settings }))
            expect(useConnectionOptions().rtcConfiguration).toEqual({
                iceTransportPolicy: 'relay',
            })
        })

        it('reverts such a browser to direct media when the feature is switched off', () => {
            window.localStorage.setItem(FORCE_RELAY_KEY, 'true')
            process.env.REACT_APP_AUTO_RELAY_FALLBACK = 'false'
            mockUseAppState.mockImplementationOnce(() => ({ settings }))
            expect(useConnectionOptions().rtcConfiguration).toBeUndefined()
            expect(window.localStorage.getItem(FORCE_RELAY_KEY)).toBeNull()
        })
    })
})
