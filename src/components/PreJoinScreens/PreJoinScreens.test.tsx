import React from 'react'
import { act } from 'react-dom/test-utils'
import DeviceSelectionScreen from './DeviceSelectionScreen/DeviceSelectionScreen'
import MediaErrorSnackbar from './MediaErrorSnackbar/MediaErrorSnackbar'
import { mount } from 'enzyme'
import PreJoinScreens from './PreJoinScreens'
import RoomNameScreen from './RoomNameScreen/RoomNameScreen'
import { useParams } from 'react-router-dom'
import { useAppState } from '../../state'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'

// @ts-ignore
delete window.location

// @ts-ignore
window.location = {
    pathname: '',
    search: '',
    origin: '',
}

const mockReplaceState = jest.fn()
Object.defineProperty(window.history, 'replaceState', {
    value: mockReplaceState,
})

jest.mock('../../state')
jest.mock('react-router-dom', () => ({ useParams: jest.fn() }))
jest.mock('../../hooks/useVideoContext/useVideoContext')
jest.mock('./MediaErrorSnackbar/MediaErrorSnackbar', () => () => null)
jest.mock('../../services/http/video.service', () => ({
    videoService: {
        validateRoomExists: jest.fn(() =>
            Promise.resolve({ roomExists: true, hasPIN: false })
        ),
    },
}))
const mockUseAppState = useAppState as jest.Mock<any>
const mockUseParams = useParams as jest.Mock<any>
const mockUseVideoContext = useVideoContext as jest.Mock<any>

jest.mock(
    '../IntroContainer/IntroContainer',
    () => ({ children }: { children: React.ReactNode }) => children
)
jest.mock('./RoomNameScreen/RoomNameScreen', () => () => null)
jest.mock('./DeviceSelectionScreen/DeviceSelectionScreen', () => () => null)
jest.mock('./ErrorScreens', () => ({ ErrorScreens: () => null }))

describe('the PreJoinScreens component', () => {
    beforeEach(jest.clearAllMocks)
    beforeEach(() => {
        mockUseAppState.mockImplementation(() => ({
            user: { displayName: 'Test User' },
        }))
        mockUseParams.mockImplementation(() => ({ URLRoomName: 'testRoom' }))
        mockUseVideoContext.mockImplementation(() => ({
            getAudioAndVideoTracks: () => Promise.resolve(),
        }))
    })

    it('should populate the room name from the URL and switch to the DeviceSelectionScreen when the displayName is present for the user', () => {
        const wrapper = mount(<PreJoinScreens />)
        const roomName = wrapper.find(DeviceSelectionScreen).prop('roomName')
        expect(roomName).toBe('testRoom')

        expect(wrapper.find(RoomNameScreen).exists()).toBe(false)
        expect(wrapper.find(DeviceSelectionScreen).exists()).toBe(true)
    })

    it('should populate the room name from the URL and stay on the RoomNameScreen when the displayName is not present for the user', () => {
        mockUseAppState.mockImplementation(() => ({ user: {} }))
        const wrapper = mount(<PreJoinScreens />)
        const roomName = wrapper.find(RoomNameScreen).prop('roomName')
        expect(roomName).toBe('testRoom')

        expect(wrapper.find(RoomNameScreen).exists()).toBe(true)
        expect(wrapper.find(DeviceSelectionScreen).exists()).toBe(false)
    })

    it('should capture errors from getAudioAndVideoTracks and pass them to the MediaErrorSnackbar component', async () => {
        const mockGetAudioAndVideoTracks = jest.fn(() =>
            Promise.reject('testError')
        )
        mockUseVideoContext.mockImplementation(() => ({
            getAudioAndVideoTracks: mockGetAudioAndVideoTracks,
        }))

        const wrapper = mount(<PreJoinScreens />)

        // This may look odd, but it prevents 'An update to PreJoinScreens inside a test was not wrapped in act(...)' warning.
        await act(async () => {
            await new Promise(setImmediate)
            wrapper.update()
        })

        const error = wrapper.find(MediaErrorSnackbar).prop('error')
        expect(error).toBe('testError')
        expect(mockGetAudioAndVideoTracks).toHaveBeenCalledTimes(1) // This makes sure that 'getAudioAndVideoTracks' isn't called repeatedly
    })
})
