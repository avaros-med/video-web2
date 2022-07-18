import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'

import { Grid, Hidden, Typography } from '@material-ui/core'
import Button from '@material-ui/core/Button'
import useRoomState from '../../hooks/useRoomState/useRoomState'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { isMobile } from '../../utils'
import EndCallButton from '../Buttons/EndCallButton/EndCallButton'
import ToggleAudioButton from '../Buttons/ToggleAudioButton/ToggleAudioButton'
import ToggleChatButton from '../Buttons/ToggleChatButton/ToggleChatButton'
import ToggleVideoButton from '../Buttons/ToggleVideoButton/ToggleVideoButton'
import ToggleScreenShareButton from '../Buttons/ToogleScreenShareButton/ToggleScreenShareButton'
import Menu from './Menu/Menu'

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        container: {
            backgroundColor: 'transparent',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${theme.footerHeight}px`,
            position: 'fixed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1em 1.43em',
            zIndex: 10,
            [theme.breakpoints.down('sm')]: {
                height: `${theme.mobileFooterHeight}px`,
                padding: 0,
            },
        },
        screenShareBanner: {
            position: 'fixed',
            zIndex: 8,
            bottom: `${theme.footerHeight}px`,
            left: 0,
            right: 0,
            height: '104px',
            background: 'rgba(0, 0, 0, 0.5)',
            '& h6': {
                color: 'white',
            },
            '& button': {
                background: 'white',
                color: theme.brand,
                border: `2px solid ${theme.brand}`,
                margin: '0 2em',
                '&:hover': {
                    color: '#600101',
                    border: `2px solid #600101`,
                    background: '#FFE9E7',
                },
            },
        },
        hideMobile: {
            display: 'initial',
            [theme.breakpoints.down('sm')]: {
                display: 'none',
            },
        },
    })
)

export default function MenuBar2() {
    const classes = useStyles()
    const { isSharingScreen, toggleScreenShare } = useVideoContext()
    const roomState = useRoomState()
    const isReconnecting = roomState === 'reconnecting'

    return (
        <>
            {isSharingScreen && (
                <Grid
                    container
                    justifyContent="center"
                    alignItems="center"
                    className={classes.screenShareBanner}
                >
                    <Typography variant="h6">
                        You are sharing your screen
                    </Typography>
                    <Button onClick={() => toggleScreenShare()}>
                        Stop Sharing
                    </Button>
                </Grid>
            )}
            <footer className={classes.container}>
                <ToggleAudioButton className="mr-2" disabled={isReconnecting} />
                <ToggleVideoButton className="mr-2" disabled={isReconnecting} />
                {!isSharingScreen && !isMobile && (
                    <ToggleScreenShareButton
                        className="mr-2"
                        disabled={isReconnecting}
                    />
                )}
                {process.env.REACT_APP_DISABLE_TWILIO_CONVERSATIONS !==
                    'true' && <ToggleChatButton />}
                <Menu buttonClassName="mr-2" />
                <EndCallButton />
            </footer>
        </>
    )
}
