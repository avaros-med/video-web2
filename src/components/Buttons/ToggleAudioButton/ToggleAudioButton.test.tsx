import React from 'react'
import { shallow } from 'enzyme'
import useLocalAudioToggle from '../../../hooks/useLocalAudioToggle/useLocalAudioToggle'

import ToggleAudioButton, {
    MIC_ALERT_HIDDEN_TOOLTIP,
    MIC_ALERT_TOOLTIP,
} from './ToggleAudioButton'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'

jest.mock('../../../hooks/useLocalAudioToggle/useLocalAudioToggle')
jest.mock('../../../hooks/useVideoContext/useVideoContext')
const mockUseLocalAudioToggle = useLocalAudioToggle as jest.Mock<any>
const mockUseVideoContext = useVideoContext as jest.Mock<any>

describe('the ToggleAudioButton component', () => {
    beforeAll(() => {
        mockUseVideoContext.mockImplementation(() => ({
            localTracks: [{ kind: 'audio' }],
        }))
    })

    it('should render correctly when audio is enabled', () => {
        mockUseLocalAudioToggle.mockImplementation(() => [true, () => {}])
        const wrapper = shallow(<ToggleAudioButton />)
        expect(wrapper.prop('icon')).toBe('mic')
        expect(wrapper.prop('tooltipContent')).toBe('Mute microphone')
    })

    it('should render correctly when audio is disabled', () => {
        mockUseLocalAudioToggle.mockImplementation(() => [false, () => {}])
        const wrapper = shallow(<ToggleAudioButton />)
        expect(wrapper.prop('icon')).toBe('mic_off')
        expect(wrapper.prop('tooltipContent')).toBe('Unmute microphone')
    })

    it('should render correctly when there are no audio tracks', () => {
        mockUseLocalAudioToggle.mockImplementation(() => [true, () => {}])
        mockUseVideoContext.mockImplementationOnce(() => ({
            localTracks: [{ kind: 'video' }],
        }))
        const wrapper = shallow(<ToggleAudioButton />)
        expect(wrapper.prop('disabled')).toEqual(true)
    })

    it('should call the correct toggle function when clicked', () => {
        const mockFn = jest.fn()
        mockUseLocalAudioToggle.mockImplementation(() => [false, mockFn])
        const wrapper = shallow(<ToggleAudioButton />)
        wrapper.prop('onClick')()
        expect(mockFn).toHaveBeenCalled()
    })

    it('should bring a dismissed microphone callout back instead of toggling mute', () => {
        const toggle = jest.fn()
        const showMicAlert = jest.fn()
        mockUseLocalAudioToggle.mockImplementation(() => [true, toggle])

        mockUseVideoContext.mockImplementation(() => ({
            localTracks: [{ kind: 'audio' }],
            audioHealth: {
                micStatus: 'not-sending',
                isMicAlertVisible: true,
                showMicAlert,
            },
        }))
        let wrapper = shallow(<ToggleAudioButton />)
        expect(wrapper.prop('tooltipContent')).toBe(MIC_ALERT_TOOLTIP)
        expect(wrapper.prop('onClick')).toBe(toggle)

        mockUseVideoContext.mockImplementation(() => ({
            localTracks: [{ kind: 'audio' }],
            audioHealth: {
                micStatus: 'not-sending',
                isMicAlertVisible: false,
                showMicAlert,
            },
        }))
        wrapper = shallow(<ToggleAudioButton />)
        expect(wrapper.prop('tooltipContent')).toBe(MIC_ALERT_HIDDEN_TOOLTIP)
        expect(wrapper.prop('onClick')).toBe(showMicAlert)
    })
})
