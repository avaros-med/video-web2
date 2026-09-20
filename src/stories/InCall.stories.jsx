import { useEffect } from 'react'
import { CssBaseline, MuiThemeProvider } from '@material-ui/core'
import { BrowserRouter as Router } from 'react-router-dom'
import App from '../App'
import theme from '../theme'
import AppStateProvider, { useAppState } from '../state'
import { VideoProvider } from '../components/VideoProvider'
import ErrorDialog from '../components/ErrorDialog/ErrorDialog'
import { ParticipantProvider } from '../components/ParticipantProvider'
import { ChatProvider } from '../components/ChatProvider'
import { EChartContextProvider } from '../components/EChartPanel/useEChartContext'
import { AvsSocketContextProvider } from '../hooks/useAvsSocketContext/useAvsSocketContext'
import { PanelContextProvider } from '../components/Panel/usePanelContext'
import useVideoContext from '../hooks/useVideoContext/useVideoContext'
import useConnectionOptions from '../utils/useConnectionOptions/useConnectionOptions'
import { LOCAL_PERSON_PHOTO } from './mocks/twilio-video'

/*
 * Renders the in-call view directly, skipping the pre-join screens, so the room
 * UI (and the audio health / screen share notifications) can be reviewed in
 * isolation. Uses the same provider stack as src/index.tsx.
 */

const AutoJoin = () => {
    const { connect, room, isConnecting } = useVideoContext()
    useEffect(() => {
        if (!room && !isConnecting) {
            connect('storybook-token')
        }
    }, [connect, room, isConnecting])
    return null
}

const VideoApp = () => {
    const { error, setError } = useAppState()
    const connectionOptions = useConnectionOptions()
    return (
        <VideoProvider options={connectionOptions} onError={setError}>
            <ErrorDialog dismissError={() => setError(null)} error={error} />
            <AutoJoin />
            <ParticipantProvider>
                <ChatProvider>
                    <EChartContextProvider>
                        <AvsSocketContextProvider>
                            <PanelContextProvider>
                                <App />
                            </PanelContextProvider>
                        </AvsSocketContextProvider>
                    </EChartContextProvider>
                </ChatProvider>
            </ParticipantProvider>
        </VideoProvider>
    )
}

/*
 * The mock has no real video track for the background processor to act on, so
 * this approximates what blur looks like: the local video is blurred and a sharp
 * copy of the same frame is clipped to the person's silhouette on top.
 */
const BlurPreviewStyles = () => (
    <style>{`
        [data-cy-participant="Local Participant"] video { filter: blur(9px); }
        [data-cy-participant="Local Participant"] [class*="innerContainer"]::after {
            content: '';
            position: absolute;
            inset: 0;
            background: url(${LOCAL_PERSON_PHOTO}) center / cover no-repeat;
            -webkit-mask-image: radial-gradient(ellipse 27% 54% at 50% 54%, #000 66%, transparent 100%);
            mask-image: radial-gradient(ellipse 27% 54% at 50% 54%, #000 66%, transparent 100%);
            transform: scaleX(-1);
            pointer-events: none;
        }
    `}</style>
)

const InCallApp = ({ blurPreview }) => (
    <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {blurPreview && <BlurPreviewStyles />}
        <Router>
            <AppStateProvider>
                <VideoApp />
            </AppStateProvider>
        </Router>
    </MuiThemeProvider>
)

export default {
    title: 'In Call',
    component: InCallApp,
    layout: 'fullscreen',
    argTypes: {
        participants: { control: { type: 'range', min: 0, max: 8, step: 1 } },
        dominantSpeaker: { control: { type: 'text' } },
        presentationParticipant: { control: { type: 'text' } },
        simulateStalledAudio: {
            control: { type: 'select' },
            options: [false, 'local', 'remote', 'both'],
        },
        disableAllAudio: { control: { type: 'boolean' } },
        unpublishAllVideo: { control: { type: 'boolean' } },
        personPosters: { control: { type: 'boolean' } },
        blurPreview: { control: { type: 'boolean' } },
    },
}

const Template = args => <InCallApp {...args} />

export const SpeakerView = Template.bind({})
SpeakerView.args = {
    participants: 1,
    dominantSpeaker: '1',
    presentationParticipant: null,
    simulateStalledAudio: false,
    disableAllAudio: false,
    unpublishAllVideo: false,
    personPosters: false,
    blurPreview: false,
}

export const MicrophoneProblem = Template.bind({})
MicrophoneProblem.args = {
    ...SpeakerView.args,
    simulateStalledAudio: 'local',
}

export const RemoteAudioProblem = Template.bind({})
RemoteAudioProblem.args = {
    ...SpeakerView.args,
    simulateStalledAudio: 'remote',
}

export const AudioProblems = Template.bind({})
AudioProblems.args = {
    ...SpeakerView.args,
    simulateStalledAudio: 'both',
}

export const BackgroundBlur = Template.bind({})
BackgroundBlur.args = {
    ...SpeakerView.args,
    personPosters: true,
    blurPreview: true,
}
