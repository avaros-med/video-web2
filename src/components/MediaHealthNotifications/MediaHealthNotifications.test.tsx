import React from 'react'
import { shallow } from 'enzyme'
import MediaHealthNotifications, {
    MIC_ALERT_COPY,
    REMOTE_AUDIO_HEADLINE,
} from './MediaHealthNotifications'
import Snackbar from '../Snackbar/Snackbar'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import useRoomState from '../../hooks/useRoomState/useRoomState'

jest.mock('../../hooks/useVideoContext/useVideoContext')
jest.mock('../../hooks/useRoomState/useRoomState')

const mockUseVideoContext = useVideoContext as jest.Mock<any>
const mockUseRoomState = useRoomState as jest.Mock<any>

const buildContext = (overrides: any = {}) => ({
    screenShareNotice: null,
    dismissScreenShareNotice: jest.fn(),
    audioHealth: {
        micStatus: 'ok',
        isMicAlertVisible: false,
        dismissMicAlert: jest.fn(),
        restartMic: jest.fn(),
        remoteAudioAlert: null,
        dismissRemoteAudioAlert: jest.fn(),
        ...overrides.audioHealth,
    },
    ...overrides,
})

const openSnackbars = (wrapper: any) =>
    wrapper
        .find(Snackbar)
        .filterWhere((s: any) => s.prop('open'))
        .map((s: any) => s.prop('headline'))

describe('the MediaHealthNotifications component', () => {
    beforeEach(() => mockUseRoomState.mockReturnValue('connected'))

    it('should render nothing open when audio is healthy', () => {
        mockUseVideoContext.mockReturnValue(buildContext())
        const wrapper = shallow(<MediaHealthNotifications />)
        expect(openSnackbars(wrapper)).toEqual([])
    })

    it('should show only the microphone alert when both mic and remote audio problems exist', () => {
        mockUseVideoContext.mockReturnValue(
            buildContext({
                audioHealth: {
                    micStatus: 'not-sending',
                    isMicAlertVisible: true,
                    remoteAudioAlert: { identity: 'Patient' },
                },
            })
        )
        const wrapper = shallow(<MediaHealthNotifications />)
        expect(openSnackbars(wrapper)).toEqual([
            MIC_ALERT_COPY['not-sending'].headline,
        ])
    })

    it('should show the remote audio alert once the microphone alert is dismissed', () => {
        mockUseVideoContext.mockReturnValue(
            buildContext({
                audioHealth: {
                    micStatus: 'not-sending',
                    isMicAlertVisible: false,
                    remoteAudioAlert: { identity: 'Patient' },
                },
            })
        )
        const wrapper = shallow(<MediaHealthNotifications />)
        expect(openSnackbars(wrapper)).toEqual([REMOTE_AUDIO_HEADLINE])
        expect(
            wrapper
                .find(Snackbar)
                .filterWhere((s: any) => s.prop('open'))
                .prop('message')
        ).toContain('Patient')
    })

    it('should prefer the screen share notice over the remote audio alert', () => {
        mockUseVideoContext.mockReturnValue(
            buildContext({
                screenShareNotice: { message: 'stopped' },
                audioHealth: { remoteAudioAlert: { identity: 'Patient' } },
            })
        )
        const wrapper = shallow(<MediaHealthNotifications />)
        expect(openSnackbars(wrapper)).toEqual(['Screen sharing stopped:'])
    })

    it('should hide everything while the room is reconnecting', () => {
        mockUseRoomState.mockReturnValue('reconnecting')
        mockUseVideoContext.mockReturnValue(
            buildContext({
                audioHealth: {
                    micStatus: 'ended',
                    isMicAlertVisible: true,
                    remoteAudioAlert: { identity: 'Patient' },
                },
            })
        )
        const wrapper = shallow(<MediaHealthNotifications />)
        expect(openSnackbars(wrapper)).toEqual([])
    })
})
