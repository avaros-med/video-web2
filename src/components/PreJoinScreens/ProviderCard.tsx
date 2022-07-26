import styled from 'styled-components'
import Colors from '../../colors'
import { Avatar } from '../UI/Avatar'

interface Props {
    classes?: string
}

const Styles = styled.div`
    padding: 12px 16px;
    background: ${Colors.CONTENT_BACKGROUND};
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

export const ProviderCard = ({ classes }: Props) => {
    return (
        <Styles className={classes ?? ''}>
            <div className="d-flex align-items-center mb-1">
                <Avatar classes="mr-2" name="Bernard Brock" />
                <span className="name">Bernard Brock</span>
            </div>
            <div className="font-weight-600">London Family Medical Centre</div>
            <div>771 Petra Heights Suite 123</div>
            <div>London ON A1A 2B2</div>
        </Styles>
    )
}
