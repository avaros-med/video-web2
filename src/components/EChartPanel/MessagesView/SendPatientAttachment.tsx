import { useState } from 'react'
import styled from 'styled-components'
import { IconButton } from '../../UI/IconButton'
import { PatientDocumentsDialog } from '../PatientDocumentsDialog/PatientDocumentsDialog'

interface Props {
    classes?: string
}

const Styles = styled.div``

export const SendPatientAttachment = ({ classes }: Props) => {
    const [showDialog, setShowDialog] = useState<boolean>(false)

    return (
        <>
            <Styles className={classes ?? ''}>
                <IconButton
                    intent="primary-fade"
                    icon="attachment"
                    onClick={() => setShowDialog(true)}
                />
            </Styles>

            <PatientDocumentsDialog
                open={showDialog}
                onClose={() => setShowDialog(false)}
            />
        </>
    )
}
