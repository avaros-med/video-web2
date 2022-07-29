import AppLogo from './AppLogo'
import styled from 'styled-components'
import { Typography } from '@material-ui/core'
import { css } from 'styled-components'

interface Props {
    classes?: string
    isLight?: boolean
}

const Styles = styled.div`
    display: flex;
    align-items: center;

    ${props =>
        props.theme.isLight &&
        css`
            color: white;
        `}
`

export const AppLogoBlock = ({ classes, isLight }: Props) => {
    return (
        <Styles className={classes ?? ''} theme={{ isLight }}>
            <AppLogo width="47px" height="40px" />
            <Typography className="ml-3 mb-1 font-weight-bold" variant="button">
                Video Visit
            </Typography>
        </Styles>
    )
}
