import React from 'react'
import { shallow } from 'enzyme'
import AudioLevelIndicator from '../AudioLevelIndicator/AudioLevelIndicator'
import MainParticipantInfo from '../MainParticipantInfo/MainParticipantInfo'
import ParticipantInfo from '../ParticipantInfo/ParticipantInfo'
import MutedBadge from './MutedBadge'
import useIsTrackEnabled from '../../hooks/useIsTrackEnabled/useIsTrackEnabled'
import usePublications from '../../hooks/usePublications/usePublications'
import useTileAudioAlert from '../../hooks/useTileAudioAlert/useTileAudioAlert'
import useTrack from '../../hooks/useTrack/useTrack'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { useAppState } from '../../state'

jest.mock('../../state')
jest.mock(
    '../../hooks/useParticipantNetworkQualityLevel/useParticipantNetworkQualityLevel',
    () => () => 4
)
jest.mock('../../hooks/usePublications/usePublications')
jest.mock('../../hooks/useIsTrackSwitchedOff/useIsTrackSwitchedOff')
jest.mock(
    '../../hooks/useParticipantIsReconnecting/useParticipantIsReconnecting'
)
jest.mock('../../hooks/useIsRecording/useIsRecording')
jest.mock('../../hooks/useTrack/useTrack')
jest.mock('../../hooks/useVideoContext/useVideoContext')
jest.mock('../../hooks/useIsTrackEnabled/useIsTrackEnabled')
jest.mock('../../hooks/useTileAudioAlert/useTileAudioAlert')

const mockUsePublications = usePublications as jest.Mock<any>
const mockUseTrack = useTrack as jest.Mock<any>
const mockUseIsTrackEnabled = useIsTrackEnabled as jest.Mock<any>
const mockUseTileAudioAlert = useTileAudioAlert as jest.Mock<any>
const mockUseVideoContext = useVideoContext as jest.Mock<any>
const mockUseAppState = useAppState as jest.Mock<any>

const participant = { identity: 'Patient', sid: 'PA1' } as any
const deviceAlert = {
    tone: 'error',
    label: 'Mic Muted',
    icon: 'mic_off',
}

const tiles: [string, () => any][] = [
    [
        'ParticipantInfo',
        () =>
            shallow(
                <ParticipantInfo participant={participant}>x</ParticipantInfo>
            ),
    ],
    [
        'MainParticipantInfo',
        () =>
            shallow(
                <MainParticipantInfo participant={participant}>
                    x
                </MainParticipantInfo>
            ),
    ],
]

describe.each(tiles)('%s mute marker', (_name, renderTile) => {
    beforeEach(() => {
        mockUseAppState.mockImplementation(() => ({
            isGalleryViewActive: false,
        }))
        mockUseVideoContext.mockImplementation(() => ({
            room: { localParticipant: {} },
        }))
        mockUsePublications.mockImplementation(() => [
            { trackName: 'mic', kind: 'audio' },
        ])
        mockUseTrack.mockImplementation((publication: any) => publication)
        mockUseIsTrackEnabled.mockImplementation(() => true)
        mockUseTileAudioAlert.mockImplementation(() => null)
    })

    it('shows the level meter and no badge while the microphone is on', () => {
        const wrapper = renderTile()
        expect(wrapper.find(MutedBadge).exists()).toBe(false)
        expect(wrapper.find(AudioLevelIndicator).exists()).toBe(true)
    })

    it('shows the Muted badge in place of the level meter when the microphone is muted', () => {
        mockUseIsTrackEnabled.mockImplementation(() => false)
        const wrapper = renderTile()
        expect(wrapper.find(MutedBadge).exists()).toBe(true)
        expect(wrapper.find(AudioLevelIndicator).exists()).toBe(false)
    })

    it('shows no badge for a participant with no audio track yet', () => {
        mockUsePublications.mockImplementation(() => [])
        mockUseTrack.mockImplementation(() => undefined)
        mockUseIsTrackEnabled.mockImplementation(() => false)
        expect(
            renderTile()
                .find(MutedBadge)
                .exists()
        ).toBe(false)
    })

    it('shows a reported device problem, unless the person muted themselves', () => {
        mockUseTileAudioAlert.mockImplementation(() => deviceAlert)
        let wrapper = renderTile()
        expect(wrapper.find('[data-cy-audio-alert-badge]').exists()).toBe(true)
        expect(wrapper.find(MutedBadge).exists()).toBe(false)

        mockUseIsTrackEnabled.mockImplementation(() => false)
        wrapper = renderTile()
        expect(wrapper.find('[data-cy-audio-alert-badge]').exists()).toBe(false)
        expect(wrapper.find(MutedBadge).exists()).toBe(true)
    })
})
