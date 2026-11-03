import { styled, Theme } from '@material-ui/core/styles'
import { CircularProgress, Typography } from '@material-ui/core'

const Container = styled('div')(({ theme }: { theme: Theme }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(2),
    background: 'black',
    color: 'white',
    textAlign: 'center',
    padding: theme.spacing(3),
}))

/*
 * Shown for the few seconds while useRelayFallback moves the call to a relayed
 * connection: the old room is gone and the new one is not up yet, which would
 * otherwise flash the pre-join screens.
 */
export default function RelayReconnectingScreen() {
    return (
        <Container data-cy-relay-reconnecting>
            <CircularProgress color="inherit" />
            <Typography variant="h5">Reconnecting your call</Typography>
            <Typography variant="body1">
                Switching to a more reliable connection. This takes a few
                seconds; the other participant will see you rejoin.
            </Typography>
        </Container>
    )
}
