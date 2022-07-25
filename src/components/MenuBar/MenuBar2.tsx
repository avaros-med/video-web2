import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'

import { Grid, Hidden, Typography } from '@material-ui/core'
import moment from 'moment'
import { useEffect, useState } from 'react'
import useRoomState from '../../hooks/useRoomState/useRoomState'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { isMobile } from '../../utils'
import EndCallButton from '../Buttons/EndCallButton/EndCallButton'
import ToggleAudioButton from '../Buttons/ToggleAudioButton/ToggleAudioButton'
import ToggleChatButton from '../Buttons/ToggleChatButton/ToggleChatButton'
import ToggleMessagesButton from '../Buttons/ToggleMessagesButton/ToggleMessagesButton'
import ToggleVideoButton from '../Buttons/ToggleVideoButton/ToggleVideoButton'
import ToggleScreenShareButton from '../Buttons/ToogleScreenShareButton/ToggleScreenShareButton'
import { Button } from '../UI/Button'
import Menu from './Menu/Menu'

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        container: {
            backgroundColor: 'black',
            color: 'white',
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
                height: 'unset',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
            },
        },
        controllersContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 'calc(50vw - 250px / 2)',
            [theme.breakpoints.down('sm')]: {
                position: 'unset',
            },
        },
        screenShareBanner: {
            '& p': {
                fontSize: 16,
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
                    background: '#dcc6c4',
                },
            },
            [theme.breakpoints.down('sm')]: {
                marginTop: 12,
                flexDirection: 'column',
            },
        },
        currentTimeContainer: {
            '& p': {
                fontSize: 16,
                fontWeight: 500,
                color: 'white',
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
            <footer className={classes.container}>
                <Hidden smDown>
                    <Grid container className={classes.currentTimeContainer}>
                        <CurrentTime />
                    </Grid>
                </Hidden>
                <Grid className={classes.controllersContainer}>
                    <ToggleAudioButton
                        className="mr-2"
                        disabled={isReconnecting}
                    />
                    <ToggleVideoButton
                        className="mr-2"
                        disabled={isReconnecting}
                    />
                    <ToggleMessagesButton className="mr-2" />
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
                </Grid>

                {isSharingScreen && (
                    <Grid
                        container
                        justifyContent="flex-end"
                        alignItems="center"
                        className={classes.screenShareBanner}
                    >
                        <Hidden smDown>
                            <Typography variant="body1">
                                You are sharing your screen
                            </Typography>
                        </Hidden>
                        <Button
                            intent="text-danger"
                            label="Stop Sharing"
                            onClick={() => toggleScreenShare()}
                        />
                    </Grid>
                )}
            </footer>
        </>
    )
}

const CurrentTime = () => {
    const [timestamp, setTimestamp] = useState<any>(moment())

    useEffect(() => {
        setInterval(() => {
            setTimestamp(moment())
        }, 1000)
    }, [])

    return (
        <Typography variant="body1">
            {timestamp.format('hh:mm:ss A')}
        </Typography>
    )
}
