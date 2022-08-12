import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
} from '@material-ui/core'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import Colors from '../../../colors'
import {
    eventBus,
    EventBusData,
} from '../../../services/event-bus/eventBus.service'
import { AttachmentAuthenticated } from '../../../services/event-bus/events'
import { DemographicDocumentType } from '../../../services/models/DemographicDocument.model'
import { AuthenticateAttachment } from '../../../services/ws/eventout'
import { socketService } from '../../../services/ws/socket.service'
import { Button } from '../../UI/Button'
import { Input } from '../../UI/Input'

interface Props {
    open: boolean
    documentId: number
    documentName: string
    documentType: DemographicDocumentType
    demographicName: string
    verifierName: string
    onClose(): void
}

const Styles = styled.div`
    .input-wrapper {
        display: inline-block;

        input {
            padding: 12px 16px;
            background: ${Colors.CONTENT_BACKGROUND};
            border: 0;
            border-radius: 5px;
        }
    }

    .color-blue {
        color: ${Colors.BLUE};
    }

    .invalid-state {
        border: 1px solid ${Colors.RED};
    }
`

export const PatientAuthenticationDialog = ({
    open,
    documentId,
    documentName,
    documentType,
    demographicName,
    verifierName,
    onClose,
}: Props) => {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const [dob, setDob] = useState<string>('')
    const [hasError, setHasError] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [errorTimer, setErrorTimer] = useState<any>(null)

    useEffect(() => setIsLoading(false), [open])

    useEffect(() => {
        const subscription = eventBus
            .getObservable()
            .subscribe((event: EventBusData) => {
                switch (event.action) {
                    case AttachmentAuthenticated.action: {
                        setHasError(false)
                        setIsLoading(false)
                        onClose()
                        if (errorTimer) {
                            clearTimeout(errorTimer)
                            setErrorTimer(null)
                        }
                        break
                    }
                }
            })

        return () => {
            subscription.unsubscribe()
        }
    }, [onClose, errorTimer])

    const onSubmit = useCallback(() => {
        const eventout: AuthenticateAttachment = {
            ID: documentId,
            name: documentName,
            type: documentType,
            patientDOB: dob,
            roomName: URLRoomName!,
            senderName: verifierName,
        }
        socketService.dispatchEvent('AuthenticateAttachment', eventout)
        setIsLoading(true)

        // Set error state if not authenticated by a certain number of seconds
        const timer = setTimeout(() => {
            setHasError(true)
            setIsLoading(false)
        }, 10000)
        setErrorTimer(timer)
    }, [documentId, documentName, documentType, verifierName, URLRoomName, dob])

    return (
        <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="xs">
            <Styles>
                <Grid className="d-flex" alignItems="flex-start">
                    <div className="pl-4 pr-2 py-4">
                        <i className="material-icons color-blue mr-4">
                            attachment
                        </i>
                    </div>
                    <div>
                        <DialogTitle className="pl-0">
                            Authenticate Required
                        </DialogTitle>
                        <DialogContent className="p-0">
                            <div>
                                Please enter the Date of Birth of{' '}
                                <b>{demographicName}</b> to download attachment
                            </div>
                            <Input
                                classes="p-1 mt-3"
                                placeholder="YYYY-MM-DD"
                                value={dob}
                                onChange={value => {
                                    setDob(value)
                                    setHasError(false)
                                }}
                                error={
                                    hasError
                                        ? 'Invalid Date of Birth'
                                        : undefined
                                }
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button
                                intent="text-primary"
                                label="Submit & Download"
                                isLoading={isLoading}
                                onClick={onSubmit}
                            />
                            <Button
                                intent="text-hint"
                                label="Cancel"
                                onClick={onClose}
                            />
                        </DialogActions>
                    </div>
                </Grid>
            </Styles>
        </Dialog>
    )
}
