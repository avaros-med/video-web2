import React from 'react'
import RoomNameScreen from './RoomNameScreen'
import { shallow } from 'enzyme'
import { useAppState } from '../../../state'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'

jest.mock('../../../state')
jest.mock('../../../hooks/useVideoContext/useVideoContext')
jest.mock('../../../services/http/video.service', () => ({
    videoService: {
        validatePin: jest.fn(() => Promise.resolve(true)),
    },
}))

const mockUseAppState = useAppState as jest.Mock<any>
const mockUseVideoContext = useVideoContext as jest.Mock<any>

mockUseVideoContext.mockImplementation(() => ({
    currentUser: null,
    appointment: null,
    isAppointmentLoading: false,
}))

describe('the RoomNameScreen component', () => {
    it('should render correctly', () => {
        mockUseAppState.mockImplementationOnce(() => ({ user: undefined }))
        const wrapper = shallow(
            <RoomNameScreen
                name="test"
                roomName="testRoom"
                pin=""
                hasPin={false}
                setName={() => {}}
                setPin={() => {}}
                handleSubmit={() => {}}
            />
        )
        expect(wrapper.exists()).toBe(true)
    })

    it('should render with a PIN input when hasPin is true', () => {
        const wrapper = shallow(
            <RoomNameScreen
                name="test"
                roomName="testRoom"
                pin=""
                hasPin={true}
                setName={() => {}}
                setPin={() => {}}
                handleSubmit={() => {}}
            />
        )
        expect(wrapper.exists()).toBe(true)
    })

    it('should render without a PIN input when hasPin is false', () => {
        const wrapper = shallow(
            <RoomNameScreen
                name="test"
                roomName="testRoom"
                pin=""
                hasPin={false}
                setName={() => {}}
                setPin={() => {}}
                handleSubmit={() => {}}
            />
        )
        expect(wrapper.exists()).toBe(true)
    })
})
