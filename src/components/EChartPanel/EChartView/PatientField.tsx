import { Grid } from '@material-ui/core'
import styled from 'styled-components'
import Colors from '../../../colors'
import { IconButton } from '../../UI/IconButton'

interface Props {
    classes?: string
    demographicName: string
    onClear: () => void
}

const Styles = styled.div`
    flex: 1;
    margin-right: 16px;
    padding: 12px 16px;
    background: ${Colors.CONTENT_BACKGROUND};
    border-radius: 5px;
    display: flex;
    align-items: center;
    font-weight: 500;

    .material-icons {
        font-size: 20px;
    }
`

export const PatientField = ({ classes, demographicName, onClear }: Props) => {
    return (
        <Grid container alignItems="center" className={classes ?? ''}>
            <Styles>
                <i className="material-icons mr-2">account_circle</i>
                <span>{demographicName}</span>
            </Styles>
            <IconButton
                intent="hint"
                icon="cached"
                onClick={onClear}
                tooltipContent="Change Patient"
            />
        </Grid>
    )
}
