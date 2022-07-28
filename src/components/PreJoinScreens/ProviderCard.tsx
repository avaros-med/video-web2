import styled from 'styled-components'
import Colors from '../../colors'
import { Appointment } from '../../services/models/Appointment.model'
import { Avatar } from '../UI/Avatar'

interface Props {
    classes?: string
    appointment: Appointment
}

const Styles = styled.div`
    padding: 12px 16px;
    background: ${Colors.BLUE}1C;
    border-radius: 5px;
    font-weight: 500;

    .name {
        font-size: 15px;
        font-weight: 600;
        color: ${Colors.BLUE};
    }

    .font-weight-600 {
        font-weight: 600;
    }
`

export const ProviderCard = ({ classes, appointment }: Props) => {
    const providerName = appointment.details.providerName ?? ''

    return (
        <Styles className={classes ?? ''}>
            <div className="d-flex align-items-center mb-1">
                <Avatar classes="mr-2" name={providerName} />
                <span className="name">{providerName}</span>
            </div>
        </Styles>
    )
}
