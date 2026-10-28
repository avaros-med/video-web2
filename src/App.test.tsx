import React from 'react'
import App from './App'
import MenuBar from './components/MenuBar/MenuBar2'
import PreJoinScreens from './components/PreJoinScreens/PreJoinScreens'
import Room from './components/Room/Room'
import { shallow } from 'enzyme'
import useHeight from './hooks/useHeight/useHeight'
import useRoomState from './hooks/useRoomState/useRoomState'
import useVideoContext from './hooks/useVideoContext/useVideoContext'
import RelayReconnectingScreen from './components/RelayReconnectingScreen/RelayReconnectingScreen'

jest.mock('swiper/react/swiper-react.js', () => ({
    Swiper: jest.fn(),
    SwiperSlide: jest.fn(),
}))

jest.mock('swiper', () => ({
    Pagination: jest.fn(),
}))

jest.mock('./hooks/useRoomState/useRoomState')
jest.mock('./hooks/useHeight/useHeight')
jest.mock('./hooks/useVideoContext/useVideoContext')

const mockUseRoomState = useRoomState as jest.Mock<any>
const mockUseHeight = useHeight as jest.Mock<any>
const mockUseVideoContext = useVideoContext as jest.Mock<any>
mockUseVideoContext.mockImplementation(() => ({
    relayFallback: { isReconnecting: false, isRelayActive: false },
}))

mockUseHeight.mockImplementation(() => '500px')

describe('the App component', () => {
    it('should render correctly when disconnected from a room', () => {
        mockUseRoomState.mockImplementation(() => 'disconnected')
        const wrapper = shallow(<App />)

        expect(wrapper.find(PreJoinScreens).exists()).toBe(true)
        expect(wrapper.find(Room).exists()).toBe(false)
        expect(wrapper.find(MenuBar).exists()).toBe(false)
    })

    it('should show the relay reconnecting screen, not the pre-join screens, while the call is moved to relay', () => {
        mockUseRoomState.mockImplementation(() => 'disconnected')
        mockUseVideoContext.mockImplementationOnce(() => ({
            relayFallback: { isReconnecting: true, isRelayActive: true },
        }))
        const wrapper = shallow(<App />)
        expect(wrapper.find(RelayReconnectingScreen).exists()).toBe(true)
        expect(wrapper.find(PreJoinScreens).exists()).toBe(false)
        expect(wrapper.find(Room).exists()).toBe(false)
    })

    it('should render correctly when connected (or reconnecting) to a room', () => {
        mockUseRoomState.mockImplementation(() => 'connected')
        const wrapper = shallow(<App />)

        expect(wrapper.find(PreJoinScreens).exists()).toBe(false)
        expect(wrapper.find(Room).exists()).toBe(true)
        expect(wrapper.find(MenuBar).exists()).toBe(true)
    })

    it('should set the height of the main container using the useHeight hook', () => {
        const wrapper = shallow(<App />)
        expect(wrapper.prop('style')).toEqual({ height: '500px' })
    })
})
