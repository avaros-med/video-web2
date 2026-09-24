import React from 'react'
import { shallow } from 'enzyme'
import MediaHealthNotifications, {
    MIC_ALERT_COPY,
    SCREEN_SHARE_STOPPED_TITLE,
    remoteAudioTitle,
} from './MediaHealthNotifications'
import MediaAlertCallout from '../MediaAlertCallout/MediaAlertCallout'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import useRoomState from '../../hooks/useRoomState/useRoomState'
import { usePanelContext } from '../Panel/usePanelContext'

jest.mock('../../hooks/useVideoContext/useVideoContext')
jest.mock('../../hooks/useRoomState/useRoomState')
jest.mock('../Panel/usePanelContext')

const mockUseVideoContext = useVideoContext as jest.Mock<any>
const mockUseRoomState = useRoomState as jest.Mock<any>
const mockUsePanelContext = usePanelContext as jest.Mock<any>
const mockShowMediaDevices = jest.fn()

const buildContext = ({ audioHealth = {}, ...overrides }: any = {}) => ({
    screenShareNotice: null,
    dismissScreenShareNotice: jest.fn(),
    toggleScreenShare: jest.fn(),
    audioHealth: {
        micStatus: 'ok',
        isMicAlertVisible: false,
        dismissMicAlert: jest.fn(),
        restartMic: jest.fn(),
        remoteAudioAlert: null,
        isRemoteAlertVisible: audioHealth.remoteAudioAlert != null,
        showMicAlert: jest.fn(),
        dismissRemoteAudioAlert: jest.fn(),
        ...audioHealth,
    },
    ...overrides,
})

const openCallouts = (wrapper: any) =>
    wrapper
        .find(MediaAlertCallout)
        .filterWhere((c: any) => c.prop('open'))
        .map((c: any) => c.prop('title'))

describe('the MediaHealthNotifications component', () => {
    beforeEach(() => {
        mockUseRoomState.mockReturnValue('connected')
        mockUsePanelContext.mockReturnValue({
            panel: { showMediaDevices: mockShowMediaDevices },
        })
    })

    it('should render nothing open when audio is healthy', () => {
        mockUseVideoContext.mockReturnValue(buildContext())
        const wrapper = shallow(<MediaHealthNotifications />)
        expect(openCallouts(wrapper)).toEqual([])
    })

    it('should show only the microphone alert, anchored to the mic button, when both mic and remote audio problems exist', () => {
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
        expect(openCallouts(wrapper)).toEqual([
            MIC_ALERT_COPY['not-sending'].title,
        ])
        const mic = wrapper.find({ 'data-testid': 'mic-alert' })
        expect(mic.prop('tone')).toBe('error')
        expect(mic.prop('anchor')).toBe('mic')
        expect(mic.prop('message')).toBe(MIC_ALERT_COPY['not-sending'].message)
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
        expect(openCallouts(wrapper)).toEqual([remoteAudioTitle('Patient')])
    })

    it('should open Media Devices and dismiss when Check speaker is clicked', () => {
        const context = buildContext({
            audioHealth: { remoteAudioAlert: { identity: 'Patient' } },
        })
        mockUseVideoContext.mockReturnValue(context)
        const wrapper = shallow(<MediaHealthNotifications />)
        wrapper
            .find({ 'data-testid': 'remote-audio-alert' })
            .prop('action')
            .onClick()
        expect(mockShowMediaDevices).toHaveBeenCalled()
        expect(context.audioHealth.dismissRemoteAudioAlert).toHaveBeenCalled()
    })

    it('should prefer the screen share notice over the remote audio alert and offer to share again', () => {
        const context = buildContext({
            screenShareNotice: { message: 'stopped' },
            audioHealth: { remoteAudioAlert: { identity: 'Patient' } },
        })
        mockUseVideoContext.mockReturnValue(context)
        const wrapper = shallow(<MediaHealthNotifications />)
        expect(openCallouts(wrapper)).toEqual([SCREEN_SHARE_STOPPED_TITLE])
        wrapper
            .find({ 'data-testid': 'screenshare-alert' })
            .prop('action')
            .onClick()
        expect(context.dismissScreenShareNotice).toHaveBeenCalled()
        expect(context.toggleScreenShare).toHaveBeenCalled()
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
        expect(openCallouts(wrapper)).toEqual([])
    })

    it('should record a dismissal when the remote audio callout times out', () => {
        const dismissRemoteAudioAlert = jest.fn()
        mockUseVideoContext.mockReturnValue(
            buildContext({
                audioHealth: {
                    remoteAudioAlert: {
                        identity: 'Patient',
                        trackSid: 'MTremote',
                    },
                    dismissRemoteAudioAlert,
                },
            })
        )
        const wrapper = shallow(<MediaHealthNotifications />)
        const callout = wrapper
            .find(MediaAlertCallout)
            .filterWhere((c: any) => c.prop('open'))

        // The timeout has to run through dismissal. Routing it anywhere else lets
        // the next three-second stats poll raise the same alert again.
        expect(callout.prop('autoHideMs')).toBeGreaterThan(0)
        callout.prop('onClose')!()
        expect(dismissRemoteAudioAlert).toHaveBeenCalled()
        expect(callout.prop('onAutoHide')).toBeUndefined()
    })

    it('should keep the remote audio callout closed while the alert is hidden but the problem remains', () => {
        mockUseVideoContext.mockReturnValue(
            buildContext({
                audioHealth: {
                    remoteAudioAlert: {
                        identity: 'Patient',
                        trackSid: 'MTremote',
                    },
                    isRemoteAlertVisible: false,
                },
            })
        )
        const wrapper = shallow(<MediaHealthNotifications />)
        expect(openCallouts(wrapper)).toEqual([])
    })
})
