import { styled, Theme } from '@material-ui/core/styles'

import PreJoinScreens from './components/PreJoinScreens/PreJoinScreens'
import ReconnectingNotification from './components/ReconnectingNotification/ReconnectingNotification'
import RecordingNotifications from './components/RecordingNotifications/RecordingNotifications'
import Room from './components/Room/Room'

import MenuBar2 from './components/MenuBar/MenuBar2'
import useHeight from './hooks/useHeight/useHeight'
import useRoomState from './hooks/useRoomState/useRoomState'
import { TopMenuBar } from './components/TopMenuBar/TopMenuBar'

const Container = styled('div')({
    display: 'grid',
    gridTemplateRows: '1fr auto',
})

const Main = styled('main')(({ theme }: { theme: Theme }) => ({
    overflow: 'hidden',
    paddingBottom: `${theme.topMenuBarHeight + theme.footerHeight}px`, // Leave some space for the footer
    background: 'black',
}))

export default function App() {
    const roomState = useRoomState()

    // Here we would like the height of the main container to be the height of the viewport.
    // On some mobile browsers, 'height: 100vh' sets the height equal to that of the screen,
    // not the viewport. This looks bad when the mobile browsers location bar is open.
    // We will dynamically set the height with 'window.innerHeight', which means that this
    // will look good on mobile browsers even after the location bar opens or closes.
    const height = useHeight()

    return (
        <Container style={{ height }}>
            {roomState === 'disconnected' ? (
                <PreJoinScreens />
            ) : (
                <Main>
                    <ReconnectingNotification />
                    <RecordingNotifications />
                    <TopMenuBar />
                    <Room />
                    <MenuBar2 />
                </Main>
            )}
        </Container>
    )
}
