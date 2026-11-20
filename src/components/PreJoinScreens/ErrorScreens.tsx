import { Typography } from '@material-ui/core'
import { AppLogoBlock } from '../UI/AppLogoBlock'
import styled from 'styled-components'

const Styles = styled.div`
    padding-bottom: 200px;
`

interface Props {
    /** The link names no video visit (rather than the service being away). */
    isNotFound?: boolean
}

export const ErrorScreens = ({ isNotFound }: Props) => {
    return (
        <Styles>
            <AppLogoBlock classes="mb-4" />
            <Typography variant="button">Whoops!</Typography>
            <Typography variant="body1">
                {isNotFound
                    ? 'This video visit link is not valid. Please check the link, or contact your clinic.'
                    : 'The video service is currently unavailable. Please contact your clinic.'}
            </Typography>
        </Styles>
    )
}
