import AppLogo from './AppLogo'
import styled from 'styled-components'
import { Typography } from '@material-ui/core'

interface Props {
    classes?: string
}

const Styles = styled.div`
    display: flex;
    align-items: center;
`

export const AppLogoBlock = ({ classes }: Props) => {
    return (
        <Styles className={classes ?? ''}>
            <AppLogo width="47px" height="40px" />
            <Typography className="ml-3 mb-1 font-weight-bold" variant="button">
                Video Chat
            </Typography>
        </Styles>
    )
}
