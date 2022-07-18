import { Grid, Hidden, makeStyles, Theme, Typography } from '@material-ui/core'
import CircularProgress from '@material-ui/core/CircularProgress'
import useChatContext from '../../../hooks/useChatContext/useChatContext'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { useAppState } from '../../../state'
import ToggleAudioButton from '../../Buttons/ToggleAudioButton/ToggleAudioButton'
import ToggleVideoButton from '../../Buttons/ToggleVideoButton/ToggleVideoButton'
import { Button } from '../../UI/Button'
import { FontWeightBoldStyles } from '../../UI/styles/styles'
import { Steps } from '../PreJoinScreens'
import LocalVideoPreview from './LocalVideoPreview/LocalVideoPreview'
import SettingsMenu from './SettingsMenu/SettingsMenu'

const useStyles = makeStyles((theme: Theme) => ({
    gutterBottom: {
        marginBottom: '1em',
        fontWeight: 500,
    },
    marginTop: {
        marginTop: '1em',
    },
    deviceButton: {
        width: '100%',
        border: '2px solid #aaa',
        margin: '1em 0',
    },
    localPreviewContainer: {},
    toggleButtonContainerWrapper: {
        display: 'flex',
        alignItems: 'center',
    },
    toggleButtonContainer: {
        marginRight: '2em',
        display: 'flex',
        alignItems: 'center',
    },
    joinButtons: {
        marginTop: '1em',
        display: 'flex',
        justifyContent: 'space-between',
        [theme.breakpoints.down('sm')]: {
            flexDirection: 'column-reverse',
            width: '100%',
            '& button': {
                margin: '0.5em 0',
            },
        },
    },
    mobileButtonBar: {
        [theme.breakpoints.down('sm')]: {
            display: 'flex',
            justifyContent: 'space-between',
            margin: '1.5em 0 1em',
        },
    },
    mobileButton: {
        padding: '0.8em 0',
        margin: 0,
    },
}))

interface DeviceSelectionScreenProps {
    name: string
    roomName: string
    setStep: (step: Steps) => void
}

export default function DeviceSelectionScreen({
    name,
    roomName,
    setStep,
}: DeviceSelectionScreenProps) {
    const classes = useStyles()
    const { getToken, isFetching } = useAppState()
    const { connect: chatConnect } = useChatContext()
    const {
        connect: videoConnect,
        isAcquiringLocalTracks,
        isConnecting,
    } = useVideoContext()
    const disableButtons = isFetching || isAcquiringLocalTracks || isConnecting

    const handleJoin = () => {
        getToken(name, roomName).then(({ token }) => {
            videoConnect(token)
            process.env.REACT_APP_DISABLE_TWILIO_CONVERSATIONS !== 'true' &&
                chatConnect(token)
        })
    }

    if (isFetching || isConnecting) {
        return (
            <Grid
                container
                justifyContent="center"
                alignItems="center"
                direction="column"
                style={{ height: '100%' }}
            >
                <div>
                    <CircularProgress variant="indeterminate" />
                </div>
                <div>
                    <Typography
                        variant="body2"
                        style={{ fontWeight: 'bold', fontSize: '16px' }}
                    >
                        Joining Meeting
                    </Typography>
                </div>
            </Grid>
        )
    }

    return (
        <>
            <Typography variant="subtitle1" className={classes.gutterBottom}>
                Media Devices
            </Typography>

            <Grid container justifyContent="center">
                <Grid item md={12} sm={12} xs={12}>
                    <div className={classes.localPreviewContainer}>
                        <LocalVideoPreview identity={name} />
                    </div>
                    <div className={classes.mobileButtonBar}>
                        <Hidden mdUp>
                            <div className={classes.toggleButtonContainer}>
                                <ToggleAudioButton
                                    className={classes.mobileButton}
                                    disabled={disableButtons}
                                />
                                <FontWeightBoldStyles className="ml-2">
                                    Audio
                                </FontWeightBoldStyles>
                            </div>
                            <div className={classes.toggleButtonContainer}>
                                <ToggleVideoButton
                                    className={classes.mobileButton}
                                    disabled={disableButtons}
                                />
                                <FontWeightBoldStyles className="ml-2">
                                    Video
                                </FontWeightBoldStyles>
                            </div>
                        </Hidden>
                    </div>
                </Grid>
                <Grid item md={12} sm={12} xs={12}>
                    <Grid
                        container
                        direction="column"
                        justifyContent="space-between"
                        style={{ height: '100%' }}
                    >
                        <div>
                            <Hidden smDown>
                                <div
                                    className={
                                        classes.toggleButtonContainerWrapper
                                    }
                                >
                                    <div
                                        className={
                                            classes.toggleButtonContainer
                                        }
                                    >
                                        <ToggleAudioButton
                                            className={classes.deviceButton}
                                            disabled={disableButtons}
                                        />
                                        <FontWeightBoldStyles className="ml-2">
                                            Audio
                                        </FontWeightBoldStyles>
                                    </div>
                                    <div
                                        className={
                                            classes.toggleButtonContainer
                                        }
                                    >
                                        <ToggleVideoButton
                                            className={classes.deviceButton}
                                            disabled={disableButtons}
                                        />
                                        <FontWeightBoldStyles className="ml-2">
                                            Video
                                        </FontWeightBoldStyles>
                                    </div>
                                </div>
                            </Hidden>

                            <SettingsMenu
                                mobileButtonClass={classes.mobileButton}
                            />
                        </div>

                        <div className={classes.joinButtons}>
                            <Button
                                intent="secondary"
                                label="Cancel"
                                onClick={() => setStep(Steps.roomNameStep)}
                            />
                            <Button
                                label="Join Now"
                                data-cy-join-now
                                onClick={handleJoin}
                                disabled={disableButtons}
                            />
                        </div>
                    </Grid>
                </Grid>
            </Grid>
        </>
    )
}
