import { Grid } from '@material-ui/core'
import { useCallback, useState } from 'react'
import styled from 'styled-components'
import Colors from '../../../colors'
import { Demographic } from '../../../services/models/Demographic.model'
import Snackbar from '../../Snackbar/Snackbar'
import { Button } from '../../UI/Button'
import { Input } from '../../UI/Input'
import { FontWeightBoldStyles } from '../../UI/styles/styles'
import { useEChartContext } from '../useEChartContext'
import { PatientField } from './PatientField'
import { useHttpDemographic } from './useHttpDemographic'

const Styles = styled.div`
    font-weight: 500;

    textarea {
        width: 100%;
        height: 300px;
        padding: 12px 16px;
        background: ${Colors.CONTENT_BACKGROUND};
        border-radius: 5px;
        border: 0;
    }
`

interface SnackBarProps {
    message: string
    isError: boolean
}

export const EncounterNoteView = () => {
    const { demographic, clearDemographic } = useEChartContext().demographic
    const { note, setNote } = useEChartContext().note
    const { createNote } = useHttpDemographic()
    const [snackBarProps, setSnackBarProps] = useState<SnackBarProps | null>(
        null
    )

    const onAddNote = useCallback(() => {
        if (!demographic || !note?.length) {
            return
        }

        createNote(demographic.demographicNo, note)
            .then(() => {
                setSnackBarProps({
                    message: 'Successfully added note',
                    isError: false,
                })
                setNote('')
            })
            .catch(() => {
                setSnackBarProps({
                    message: 'Unable to create note',
                    isError: true,
                })
            })
    }, [demographic, note, createNote])

    if (!demographic) {
        return null
    }

    return (
        <Styles>
            <FontWeightBoldStyles className="d-block mb-1">
                Patient
            </FontWeightBoldStyles>
            <PatientField
                classes="mb-4"
                demographicName={Demographic.getFullName(demographic)}
                onClear={clearDemographic}
            />
            <FontWeightBoldStyles className="d-block mb-1">
                Note
            </FontWeightBoldStyles>
            <Input
                classes="mb-3"
                multiline
                placeholder="Enter Note"
                value={note}
                onChange={setNote}
            />
            <Grid container justifyContent="flex-end">
                <Button
                    intent="primary-fade"
                    label="Add Note to eChart"
                    onClick={onAddNote}
                />
            </Grid>

            <Snackbar
                open={!!snackBarProps}
                handleClose={() => setSnackBarProps(null)}
                variant={snackBarProps?.isError ? 'error' : 'info'}
                headline={snackBarProps?.message || ''}
                message=""
                autoHideDuration={3000}
            />
        </Styles>
    )
}
