import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@material-ui/core'
import { Button } from '../../UI/Button'
import { SelectPatientView } from '../EChartView/SelectPatientView'
import { useEChartContext } from '../useEChartContext'
import PatientDocumentsList from './PatientDocumentsList'

interface Props {
    open: boolean
    onClose(): void
}

export const PatientDocumentsDialog = ({ open, onClose }: Props) => {
    const { demographic, clearDemographic } = useEChartContext().demographic

    return (
        <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="xs">
            <DialogTitle>Patient Documents</DialogTitle>
            <DialogContent className="p-0">
                {!demographic ? (
                    <SelectPatientView classes="p-4" />
                ) : (
                    <PatientDocumentsList />
                )}
            </DialogContent>
            <DialogActions>
                {demographic && (
                    <Button
                        intent="text-primary"
                        label="Change Patient"
                        onClick={clearDemographic}
                    />
                )}
                <Button intent="text-hint" label="Close" onClick={onClose} />
            </DialogActions>
        </Dialog>
    )
}
