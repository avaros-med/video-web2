import styled from 'styled-components'
import Colors from '../../colors'

interface Props {
    classes?: string
    children: JSX.Element
}

const Styles = styled.div`
    padding: 4px;
    background: ${Colors.BLUE}2F;
    color: ${Colors.BLUE};
    border-radius: 5px;
    font-size: 13px;
    font-weight: 500;

    .material-icons {
        font-size: 16px;
    }
`

export const Chip = ({ classes, children }: Props) => {
    return <Styles className={classes ?? ''}>{children}</Styles>
}
