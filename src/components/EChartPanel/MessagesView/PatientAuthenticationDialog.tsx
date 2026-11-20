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
import { videoService } from '../../../services/http/video.service'
import { FileOffer } from '../../../services/models/Message.model'
import { utilsService } from '../../../services/utils.service'
import { Button } from '../../UI/Button'
import { InputMask } from '../../UI/InputMask'

interface Props {
    open: boolean
    offer: FileOffer
    /** The document was downloaded: it cannot be opened again. */
    onOpened(): void
    /** The document is no longer offered (opened, expired, or too many wrong dates). */
    onGone(): void
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
        border-radius: 5px;
    }
`

/**
 * The patient opens a chart document the provider passed (ehr docs/schedule-video.md
 * V15): ehr hands it over once, when the date of birth typed is the chart's. A wrong one
 * can be corrected; after five, ehr withdraws the offer.
 */
export const PatientAuthenticationDialog = ({
    open,
    offer,
    onOpened,
    onGone,
    onClose,
}: Props) => {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const [dob, setDob] = useState<string>('')
    const [error, setError] = useState<string | undefined>(undefined)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    useEffect(() => {
        setIsLoading(false)
        setError(undefined)
    }, [open])

    const onSubmit = useCallback(async () => {
        if (!URLRoomName) {
            return
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
            setError('Enter your date of birth as YYYY-MM-DD')
            return
        }
        setIsLoading(true)
        try {
            const result = await videoService.openDocument(
                URLRoomName,
                offer.id,
                dob
            )
            if (result === 'wrong_birth_date') {
                setError('Invalid Date of Birth')
            } else if (result === 'gone') {
                onGone()
                onClose()
            } else {
                utilsService.saveBlob(result.blob, offer.name)
                onOpened()
                onClose()
            }
        } catch (openError) {
            console.error('Could not open the document', openError)
            setError('The document could not be opened. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [URLRoomName, offer.id, offer.name, dob, onOpened, onGone, onClose])

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
                            Authentication Required
                        </DialogTitle>
                        <DialogContent className="p-0">
                            <div>
                                Please enter your Date of Birth to download{' '}
                                <b>{offer.name}</b>
                            </div>
                            <InputMask
                                classes="p-1 mt-3"
                                mask="9999-99-99"
                                placeholder="YYYY-MM-DD"
                                value={dob}
                                onChange={value => {
                                    setDob(value)
                                    setError(undefined)
                                }}
                                error={error}
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
