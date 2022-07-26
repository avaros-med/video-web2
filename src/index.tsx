import ReactDOM from 'react-dom'

import { CssBaseline } from '@material-ui/core'
import { MuiThemeProvider } from '@material-ui/core/styles'

// using node-style package resolution in a CSS file:
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/popover2/lib/css/blueprint-popover2.css'
import 'normalize.css'

import {
    BrowserRouter as Router,
    Redirect,
    Route,
    Switch,
} from 'react-router-dom'
import App from './App'
import { ChatProvider } from './components/ChatProvider'
import { EChartContextProvider } from './components/EChartPanel/useEChartContext'
import ErrorDialog from './components/ErrorDialog/ErrorDialog'
import LoginPage from './components/LoginPage/LoginPage'
import { PanelContextProvider } from './components/Panel/usePanelContext'
import { ParticipantProvider } from './components/ParticipantProvider'
import PrivateRoute from './components/PrivateRoute/PrivateRoute'
import UnsupportedBrowserWarning from './components/UnsupportedBrowserWarning/UnsupportedBrowserWarning'
import { VideoProvider } from './components/VideoProvider'
import { AvsSocketContextProvider } from './hooks/useAvsSocketContext/useAvsSocketContext'
import AppStateProvider, { useAppState } from './state'
import theme from './theme'
import './types'
import useConnectionOptions from './utils/useConnectionOptions/useConnectionOptions'

const VideoApp = () => {
    const { error, setError } = useAppState()
    const connectionOptions = useConnectionOptions()

    return (
        <VideoProvider options={connectionOptions} onError={setError}>
            <ErrorDialog dismissError={() => setError(null)} error={error} />
            <ParticipantProvider>
                <ChatProvider>
                    <AvsSocketContextProvider>
                        <PanelContextProvider>
                            <EChartContextProvider>
                                <App />
                            </EChartContextProvider>
                        </PanelContextProvider>
                    </AvsSocketContextProvider>
                </ChatProvider>
            </ParticipantProvider>
        </VideoProvider>
    )
}

const baseHref = process.env.REACT_APP_BASE_HREF

export const ReactApp = () => (
    <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <UnsupportedBrowserWarning>
            <Router>
                <AppStateProvider>
                    <Switch>
                        <PrivateRoute exact path={`${baseHref}/`}>
                            <VideoApp />
                        </PrivateRoute>
                        <PrivateRoute path={`${baseHref}/room/:URLRoomName`}>
                            <VideoApp />
                        </PrivateRoute>
                        <Route path={`${baseHref}/login`}>
                            <LoginPage />
                        </Route>
                        <Redirect to={`${baseHref}/`} />
                    </Switch>
                </AppStateProvider>
            </Router>
        </UnsupportedBrowserWarning>
    </MuiThemeProvider>
)

ReactDOM.render(<ReactApp />, document.getElementById('root'))
