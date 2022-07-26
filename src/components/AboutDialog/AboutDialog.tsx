import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'
import { PropsWithChildren } from 'react'

import Video from 'twilio-video'
import { version as appVersion } from '../../../package.json'
import { useAppState } from '../../state'
import { Button } from '../UI/Button'

interface AboutDialogProps {
    open: boolean
    onClose(): void
}

function AboutDialog({ open, onClose }: PropsWithChildren<AboutDialogProps>) {
    const { roomType } = useAppState()
    return (
        <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="xs">
            <DialogTitle>About</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Browser supported: {String(Video.isSupported)}
                </DialogContentText>
                <DialogContentText>
                    SDK Version: {Video.version}
                </DialogContentText>
                <DialogContentText>App Version: {appVersion}</DialogContentText>
                <DialogContentText>
                    Deployed Tag: {process.env.REACT_APP_GIT_TAG || 'N/A'}
                </DialogContentText>
                <DialogContentText>
                    Deployed Commit Hash:{' '}
                    {process.env.REACT_APP_GIT_COMMIT || 'N/A'}
                </DialogContentText>
                {roomType && (
                    <DialogContentText>Room Type: {roomType}</DialogContentText>
                )}
            </DialogContent>
            <DialogActions>
                <Button label="OK" onClick={onClose} />
            </DialogActions>
        </Dialog>
    )
}

export default AboutDialog
