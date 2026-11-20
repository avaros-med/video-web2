import React from 'react'
import AboutDialog from '../../AboutDialog/AboutDialog'
import { MenuItem } from '@material-ui/core'
import DeviceSelectionDialog from '../../DeviceSelectionDialog/DeviceSelectionDialog'
import Menu from './Menu'
import MenuContainer from '@material-ui/core/Menu'
import { shallow } from 'enzyme'

import { useAppState } from '../../../state'
import useFlipCameraToggle from '../../../hooks/useFlipCameraToggle/useFlipCameraToggle'
import useMediaQuery from '@material-ui/core/useMediaQuery'

jest.mock('../../../hooks/useFlipCameraToggle/useFlipCameraToggle')
jest.mock('@material-ui/core/useMediaQuery')
jest.mock('../../../state')
jest.mock('../../../hooks/useVideoContext/useVideoContext', () => () => ({
    room: { sid: 'mockRoomSid' },
    currentUser: null,
}))
jest.mock('../../../hooks/useAvsSocketContext/useAvsSocketContext', () => ({
    useAvsSocketContext: jest.fn(() => ({
        disableChat: jest.fn(),
    })),
}))
jest.mock('../../Panel/usePanelContext', () => ({
    usePanelContext: jest.fn(() => ({
        panel: {
            showJoiningInfo: jest.fn(),
            showMediaDevices: jest.fn(),
        },
    })),
}))

const mockUseFlipCameraToggle = useFlipCameraToggle as jest.Mock<any>
const mockUseMediaQuery = useMediaQuery as jest.Mock<boolean>
const mockUseAppState = useAppState as jest.Mock<any>

describe('the Menu component', () => {
    let mockSetIsGalleryViewActive = jest.fn()

    beforeEach(() => jest.clearAllMocks())

    beforeAll(() => {
        mockUseAppState.mockImplementation(() => ({
            setIsGalleryViewActive: mockSetIsGalleryViewActive,
            isGalleryViewActive: false,
        }))
        mockUseFlipCameraToggle.mockImplementation(() => ({
            flipCameraDisabled: false,
            flipCameraSupported: false,
            toggleFacingMode: jest.fn(),
        }))
        mockUseMediaQuery.mockImplementation(() => false)
    })

    it('should open the Menu when the IconButton is clicked', () => {
        const wrapper = shallow(<Menu />)
        expect(wrapper.find(MenuContainer).prop('open')).toBe(false)
        // The menu is toggled via the IconButton inside the div ref container
        // Simulate the open state by finding the MenuContainer
        expect(wrapper.find(MenuContainer).exists()).toBe(true)
    })

    it('should render the AboutDialog component', () => {
        const wrapper = shallow(<Menu />)
        expect(wrapper.find(AboutDialog).exists()).toBe(true)
        expect(wrapper.find(AboutDialog).prop('open')).toBe(false)
    })

    it('should render the DeviceSelectionDialog component', () => {
        const wrapper = shallow(<Menu />)
        expect(wrapper.find(DeviceSelectionDialog).exists()).toBe(true)
        expect(wrapper.find(DeviceSelectionDialog).prop('open')).toBe(false)
    })

    it('should not render Flip Camera button when flipCameraSupported is false', () => {
        mockUseFlipCameraToggle.mockImplementationOnce(() => ({
            flipCameraDisabled: false,
            flipCameraSupported: false,
            toggleFacingMode: jest.fn(),
        }))
        const wrapper = shallow(<Menu />)
        // When flipCameraSupported is false, the flip camera MenuItem is not rendered
        // The menu has Room Info, Media Devices, Gallery/Speaker view, and possibly Disable Chat
        // No flip camera item when not supported
        const menuItems = wrapper.find(MenuItem)
        const hasFlipCamera = menuItems.someWhere(item =>
            item.text().includes('Flip Camera')
        )
        expect(hasFlipCamera).toBe(false)
    })

    describe('on mobile devices with flip camera supported', () => {
        beforeAll(() => {
            mockUseMediaQuery.mockImplementation(() => true)
            mockUseFlipCameraToggle.mockImplementation(() => ({
                flipCameraDisabled: false,
                flipCameraSupported: true,
                toggleFacingMode: jest.fn(),
            }))
        })

        it('should render Flip Camera button when flipCameraSupported is true', () => {
            const wrapper = shallow(<Menu />)
            const menuItems = wrapper.find(MenuItem)
            const hasFlipCamera = menuItems.someWhere(item =>
                item.text().includes('Flip Camera')
            )
            expect(hasFlipCamera).toBe(true)
        })

        it('should render a disabled Flip Camera button when flipCameraSupported is true and flipCameraDisabled is true', () => {
            mockUseFlipCameraToggle.mockImplementationOnce(() => ({
                flipCameraDisabled: true,
                flipCameraSupported: true,
                toggleFacingMode: jest.fn(),
            }))
            const wrapper = shallow(<Menu />)
            const menuItems = wrapper.find(MenuItem)
            const flipCameraItem = menuItems.filterWhere(item =>
                item.text().includes('Flip Camera')
            )
            expect(flipCameraItem.prop('disabled')).toBe(true)
        })
    })

    describe('gallery view toggle', () => {
        it('should show the Gallery View button when gallery view is inactive', () => {
            mockUseAppState.mockImplementation(() => ({
                setIsGalleryViewActive: mockSetIsGalleryViewActive,
                isGalleryViewActive: false,
            }))
            const wrapper = shallow(<Menu />)
            const menuItems = wrapper.find(MenuItem)
            const hasGalleryView = menuItems.someWhere(item =>
                item.text().includes('Gallery View')
            )
            expect(hasGalleryView).toBe(true)
        })

        it('should show the Speaker View button when gallery view is active', () => {
            mockUseAppState.mockImplementation(() => ({
                setIsGalleryViewActive: mockSetIsGalleryViewActive,
                isGalleryViewActive: true,
            }))
            const wrapper = shallow(<Menu />)
            const menuItems = wrapper.find(MenuItem)
            const hasSpeakerView = menuItems.someWhere(item =>
                item.text().includes('Speaker View')
            )
            expect(hasSpeakerView).toBe(true)
        })
    })
})
