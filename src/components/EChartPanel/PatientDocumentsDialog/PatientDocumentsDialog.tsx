import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@material-ui/core'
import { Demographic } from '../../../services/models/Demographic.model'
import { Button } from '../../UI/Button'
import { FontWeightBoldStyles } from '../../UI/styles/styles'
import { PatientField } from '../EChartView/PatientField'
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
            {demographic && (
                <div className="px-4 pt-4">
                    <FontWeightBoldStyles className="d-block mb-1">
                        Patient
                    </FontWeightBoldStyles>
                    <PatientField
                        classes="mb-4"
                        demographicName={Demographic.getFullName(demographic)}
                        onClear={clearDemographic}
                    />
                </div>
            )}
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
