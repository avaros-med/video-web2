import { Divider, Hidden, Typography } from '@material-ui/core'
import { makeStyles, Theme } from '@material-ui/core/styles'
import { forwardRef, useImperativeHandle } from 'react'
import AudioInputList from '../DeviceSelectionDialog/AudioInputList/AudioInputList'
import AudioOutputList from '../DeviceSelectionDialog/AudioOutputList/AudioOutputList'
import MaxGalleryViewParticipants from '../DeviceSelectionDialog/MaxGalleryViewParticipants/MaxGalleryViewParticipants'
import VideoInputList from '../DeviceSelectionDialog/VideoInputList/VideoInputList'

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        height: `calc(100% - ${theme.footerHeight}px)`,
        padding: '1em 1em 3em',
        overflowY: 'auto',
    },
    button: {
        float: 'right',
    },
    paper: {
        [theme.breakpoints.down('xs')]: {
            margin: '16px',
        },
    },
    headline: {
        fontSize: '1rem',
    },
    listSection: {
        margin: '2em 0 0.8em',
        '&:first-child': {
            margin: '1em 0 2em 0',
        },
    },
    listSectionTitle: {
        marginBottom: '1.3em',
        display: 'flex',
        alignItems: 'center',
    },
}))

export const MediaDevicesPanel = forwardRef((_, ref: any) => {
    const classes = useStyles()

    // Pass references to parent component
    useImperativeHandle(ref, () => ({
        getName: () => 'Media Devices',
    }))

    return (
        <div ref={ref} className={classes.container}>
            <div className={classes.listSection}>
                <div className={classes.listSectionTitle}>
                    <i className="material-icons mr-2">videocam</i>
                    <Typography variant="h6" className={classes.headline}>
                        Video
                    </Typography>
                </div>
                <VideoInputList />
            </div>
            <Divider />
            <div className={classes.listSection}>
                <div className={classes.listSectionTitle}>
                    <i className="material-icons mr-2">speaker</i>
                    <Typography variant="h6" className={classes.headline}>
                        Audio
                    </Typography>
                </div>
                <AudioInputList />
            </div>
            <div className={classes.listSection}>
                <AudioOutputList />
            </div>
            <Hidden smDown>
                <Divider />
                <div className={classes.listSection}>
                    <div className={classes.listSectionTitle}>
                        <i className="material-icons mr-2">grid_view</i>
                        <Typography variant="h6" className={classes.headline}>
                            Gallery View
                        </Typography>
                    </div>
                    <MaxGalleryViewParticipants />
                </div>
            </Hidden>
        </div>
    )
})
