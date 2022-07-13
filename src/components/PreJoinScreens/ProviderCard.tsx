import styled from 'styled-components'
import Colors from '../../colors'

interface Props {
    classes?: string
}

const Styles = styled.div`
    padding: 12px 16px;
    background: ${Colors.CONTENT_BACKGROUND};
    border-radius: 5px;
`

export const ProviderCard = ({ classes }: Props) => {
    return <Styles className={classes ?? ''}>ProviderCard</Styles>
}
