import React from 'react'
import { shallow } from 'enzyme'
import useScreenShareParticipant from '../../../hooks/useScreenShareParticipant/useScreenShareParticipant'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'

import ToggleScreenShareButton, {
    SCREEN_SHARE_TEXT,
    SHARE_IN_PROGRESS_TEXT,
    SHARE_NOT_SUPPORTED_TEXT,
} from './ToggleScreenShareButton'
import { IconButton } from '../../UI/IconButton'

jest.mock('../../../hooks/useScreenShareParticipant/useScreenShareParticipant')
jest.mock('../../../hooks/useVideoContext/useVideoContext')

const mockUseScreenShareParticipant = useScreenShareParticipant as jest.Mock<
    any
>
const mockUseVideoContext = useVideoContext as jest.Mock<any>

const mockToggleScreenShare = jest.fn()
mockUseVideoContext.mockImplementation(() => ({
    toggleScreenShare: mockToggleScreenShare,
}))

Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getDisplayMedia: () => {},
    },
    configurable: true,
})

describe('the ToggleScreenShareButton component', () => {
    it('should render correctly when screenSharing is allowed', () => {
        mockUseScreenShareParticipant.mockImplementationOnce(() => undefined)
        const wrapper = shallow(<ToggleScreenShareButton />)
        expect(wrapper.find(IconButton).exists()).toBe(true)
        expect(wrapper.find(IconButton).prop('disabled')).toBeFalsy()
    })

    it('should render correctly when another user is sharing their screen', () => {
        mockUseScreenShareParticipant.mockImplementationOnce(
            () => 'mockParticipant'
        )
        const wrapper = shallow(<ToggleScreenShareButton />)
        expect(wrapper.find(IconButton).prop('disabled')).toBe(true)
        expect(wrapper.find(IconButton).prop('tooltipContent')).toBe(
            SHARE_IN_PROGRESS_TEXT
        )
    })

    it('should call the correct toggle function when clicked', () => {
        const wrapper = shallow(<ToggleScreenShareButton />)
        wrapper.find(IconButton).simulate('click')
        expect(mockToggleScreenShare).toHaveBeenCalled()
    })

    it('should render the screenshare button with the correct messaging if screensharing is not supported', () => {
        Object.defineProperty(navigator, 'mediaDevices', {
            value: { getDisplayMedia: undefined },
            configurable: true,
        })
        const wrapper = shallow(<ToggleScreenShareButton />)
        expect(wrapper.find(IconButton).prop('disabled')).toBe(true)
        expect(wrapper.find(IconButton).prop('tooltipContent')).toBe(
            SHARE_NOT_SUPPORTED_TEXT
        )
    })
})
