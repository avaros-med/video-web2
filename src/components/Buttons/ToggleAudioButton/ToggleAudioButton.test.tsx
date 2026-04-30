import React from 'react'
import { shallow } from 'enzyme'
import useLocalAudioToggle from '../../../hooks/useLocalAudioToggle/useLocalAudioToggle'
import ToggleAudioButton from './ToggleAudioButton'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { IconButton } from '../../UI/IconButton'

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
        expect(wrapper.find(IconButton).prop('icon')).toBe('mic')
    })

    it('should render correctly when audio is disabled', () => {
        mockUseLocalAudioToggle.mockImplementation(() => [false, () => {}])
        const wrapper = shallow(<ToggleAudioButton />)
        expect(wrapper.find(IconButton).prop('icon')).toBe('mic_off')
    })

    it('should render correctly when there are no audio tracks', () => {
        mockUseLocalAudioToggle.mockImplementation(() => [true, () => {}])
        mockUseVideoContext.mockImplementationOnce(() => ({
            localTracks: [{ kind: 'video' }],
        }))
        const wrapper = shallow(<ToggleAudioButton />)
        expect(wrapper.find(IconButton).prop('disabled')).toEqual(true)
    })

    it('should call the correct toggle function when clicked', () => {
        const mockFn = jest.fn()
        mockUseLocalAudioToggle.mockImplementation(() => [false, mockFn])
        const wrapper = shallow(<ToggleAudioButton />)
        wrapper.find(IconButton).simulate('click')
        expect(mockFn).toHaveBeenCalled()
    })
})
