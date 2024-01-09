import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'
import { PropsWithChildren, useState } from 'react'
import styled from 'styled-components'

import { Button } from '../UI/Button'
import { Input } from '../UI/Input'
import Colors from '../../colors'
import { Checkbox } from '../UI/Checkbox'

interface EndCallDialogProps {
    open: boolean
    onConfirmed(response: EndCallDialogResponse): void
    onClose(): void
}

export interface EndCallDialogResponse {
    comments: string
    isInterrupted: boolean
    isAbandoned: boolean
}

const Styles = styled.div`
    .input-wrapper {
        textarea {
            width: 100%;
            border: 1px solid ${Colors.BORDER_COLOR};
            resize: none;
        }
    }
`

function EndCallDialog({
    open,
    onConfirmed,
    onClose,
}: PropsWithChildren<EndCallDialogProps>) {
    const [comments, setComments] = useState<string>('')
    const [isInterrupted, setIsInterrupted] = useState<boolean>(false)
    const [isAbandoned, setIsAbandoned] = useState<boolean>(false)

    return (
        <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="xs">
            <Styles>
                <DialogTitle>Ending Call</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        How was your experience? (Optional)
                        <Input
                            classes="w-100"
                            value={comments}
                            onChange={setComments}
                            multiline
                        />
                    </DialogContentText>
                    <DialogContentText>
                        <Checkbox
                            value={isInterrupted ? 'true' : 'false'}
                            onChange={() => setIsInterrupted(prev => !prev)}
                            label="Call was interrupted"
                        />
                    </DialogContentText>
                    <DialogContentText>
                        <Checkbox
                            value={isAbandoned ? 'true' : 'false'}
                            onChange={() => setIsAbandoned(prev => !prev)}
                            label="Call was abandoned"
                        />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        intent="text-hint"
                        label="Cancel"
                        onClick={onClose}
                    />
                    <Button
                        intent="danger"
                        label="End call"
                        onClick={() => {
                            onConfirmed({
                                comments,
                                isInterrupted,
                                isAbandoned,
                            })
                            onClose()
                        }}
                    />
                </DialogActions>
            </Styles>
        </Dialog>
    )
}

export default EndCallDialog
