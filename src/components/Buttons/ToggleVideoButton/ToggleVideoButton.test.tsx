import React from 'react'
import { shallow } from 'enzyme'
import useLocalVideoToggle from '../../../hooks/useLocalVideoToggle/useLocalVideoToggle'
import ToggleVideoButton from './ToggleVideoButton'
import useDevices from '../../../hooks/useDevices/useDevices'
import { IconButton } from '../../UI/IconButton'

jest.mock('../../../hooks/useDevices/useDevices')
jest.mock('../../../hooks/useLocalVideoToggle/useLocalVideoToggle')

const mockUseLocalVideoToggle = useLocalVideoToggle as jest.Mock<any>
const mockUseDevices = useDevices as jest.Mock<any>

describe('the ToggleVideoButton component', () => {
    beforeAll(() => {
        mockUseDevices.mockImplementation(() => ({
            hasVideoInputDevices: true,
        }))
    })

    it('should render correctly when video is enabled', () => {
        mockUseLocalVideoToggle.mockImplementation(() => [true, () => {}])
        const wrapper = shallow(<ToggleVideoButton />)
        expect(wrapper.find(IconButton).prop('icon')).toBe('videocam')
    })

    it('should render correctly when video is disabled', () => {
        mockUseLocalVideoToggle.mockImplementation(() => [false, () => {}])
        const wrapper = shallow(<ToggleVideoButton />)
        expect(wrapper.find(IconButton).prop('icon')).toBe('videocam_off')
    })

    it('should render correctly when no video devices exist', () => {
        mockUseLocalVideoToggle.mockImplementation(() => [true, () => {}])
        mockUseDevices.mockImplementationOnce(() => ({
            hasVideoInputDevices: false,
        }))
        const wrapper = shallow(<ToggleVideoButton />)
        expect(wrapper.find(IconButton).prop('disabled')).toEqual(true)
    })

    it('should call the correct toggle function when clicked', () => {
        const mockFn = jest.fn()
        mockUseLocalVideoToggle.mockImplementation(() => [false, mockFn])
        const wrapper = shallow(<ToggleVideoButton />)
        wrapper.find(IconButton).simulate('click')
        expect(mockFn).toHaveBeenCalled()
    })

    it('should throttle the toggle function to 500ms', () => {
        const mockFn = jest.fn()
        mockUseLocalVideoToggle.mockImplementation(() => [false, mockFn])
        const wrapper = shallow(<ToggleVideoButton />)
        Date.now = () => 100000
        wrapper.find(IconButton).simulate('click') // Should register
        Date.now = () => 100400
        wrapper.find(IconButton).simulate('click') // Should be ignored (within 500ms)
        Date.now = () => 100501
        wrapper.find(IconButton).simulate('click') // Should register
        expect(mockFn).toHaveBeenCalledTimes(2)
    })
})
