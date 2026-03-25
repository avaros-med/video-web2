import { Typography } from '@material-ui/core'
import { AppLogoBlock } from '../UI/AppLogoBlock'
import styled from 'styled-components'

const Styles = styled.div`
    padding-bottom: 200px;
`

export const ErrorScreens = () => {
    return (
        <Styles>
            <AppLogoBlock classes="mb-4" />
            <Typography variant="button">Whoops!</Typography>
            <Typography variant="body1">
                The video service is currently unavailable. Please contact your
                clinic.
            </Typography>
        </Styles>
    )
}
