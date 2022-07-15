import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Hidden,
    Theme,
    Typography,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { Button } from '../UI/Button'
import AudioInputList from './AudioInputList/AudioInputList'
import AudioOutputList from './AudioOutputList/AudioOutputList'
import MaxGalleryViewParticipants from './MaxGalleryViewParticipants/MaxGalleryViewParticipants'
import VideoInputList from './VideoInputList/VideoInputList'

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        width: '600px',
        minHeight: '400px',
        [theme.breakpoints.down('xs')]: {
            width: 'calc(100vw - 32px)',
        },
        '& .inputSelect': {
            width: '100%',
        },
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
        marginBottom: '1.3em',
        fontSize: '1.1rem',
    },
    listSection: {
        margin: '2em 0 0.8em',
        '&:first-child': {
            margin: '1em 0 2em 0',
        },
    },
}))

export default function DeviceSelectionDialog({
    open,
    onClose,
}: {
    open: boolean
    onClose: () => void
}) {
    const classes = useStyles()

    return (
        <Dialog
            open={open}
            onClose={onClose}
            classes={{ paper: classes.paper }}
        >
            <DialogTitle>Audio and Video Settings</DialogTitle>
            <Divider />
            <DialogContent className={classes.container}>
                <div className={classes.listSection}>
                    <Typography variant="h6" className={classes.headline}>
                        Video
                    </Typography>
                    <VideoInputList />
                </div>
                <Divider />
                <div className={classes.listSection}>
                    <Typography variant="h6" className={classes.headline}>
                        Audio
                    </Typography>
                    <AudioInputList />
                </div>
                <div className={classes.listSection}>
                    <AudioOutputList />
                </div>
                <Hidden smDown>
                    <Divider />
                    <div className={classes.listSection}>
                        <Typography variant="h6" className={classes.headline}>
                            Gallery View
                        </Typography>
                        <MaxGalleryViewParticipants />
                    </div>
                </Hidden>
            </DialogContent>
            <Divider />
            <DialogActions>
                <Button label="Done" onClick={onClose} />
            </DialogActions>
        </Dialog>
    )
}
