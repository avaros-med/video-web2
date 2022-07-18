import { styled, Theme } from '@material-ui/core/styles'

import PreJoinScreens from './components/PreJoinScreens/PreJoinScreens'
import ReconnectingNotification from './components/ReconnectingNotification/ReconnectingNotification'
import RecordingNotifications from './components/RecordingNotifications/RecordingNotifications'
import Room from './components/Room/Room'

import MenuBar2 from './components/MenuBar/MenuBar2'
import { TopMenuBar } from './components/TopMenuBar/TopMenuBar'
import { Panel } from './components/Panel/Panel'
import useHeight from './hooks/useHeight/useHeight'
import useRoomState from './hooks/useRoomState/useRoomState'

const RootContainer = styled('div')({
    display: 'grid',
    gridTemplateRows: '1fr auto',
})

const MainContainer = styled('main')(({ theme }: { theme: Theme }) => ({
    overflow: 'hidden',
    paddingBottom: `${theme.topMenuBarHeight + theme.footerHeight}px`, // Leave some space for the footer
    background: 'black',
}))

const RoomContainer = styled('div')({
    height: '100%',
    display: 'flex',
    position: 'relative',
})

export default function App() {
    const roomState = useRoomState()

    // Here we would like the height of the main container to be the height of the viewport.
    // On some mobile browsers, 'height: 100vh' sets the height equal to that of the screen,
    // not the viewport. This looks bad when the mobile browsers location bar is open.
    // We will dynamically set the height with 'window.innerHeight', which means that this
    // will look good on mobile browsers even after the location bar opens or closes.
    const height = useHeight()

    return (
        <RootContainer style={{ height }}>
            {roomState === 'disconnected' ? (
                <PreJoinScreens />
            ) : (
                <MainContainer>
                    <ReconnectingNotification />
                    <RecordingNotifications />
                    <TopMenuBar />
                    <RoomContainer>
                        <Room />
                        <Panel />
                    </RoomContainer>
                    <MenuBar2 />
                </MainContainer>
            )}
        </RootContainer>
    )
}
