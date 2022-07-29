import { Grid } from '@material-ui/core'
import { useState } from 'react'
import styled from 'styled-components'
import Colors from '../../colors'
import Snackbar from '../Snackbar/Snackbar'
import { IconButton } from './IconButton'

interface Props {
    classes?: string
}

const Styles = styled.div`
    padding: 1em;
    border-radius: 5px;
    background: ${Colors.BLUE}1C;
    font-weight: 500;

    &:hover {
        cursor: pointer;
    }

    .url {
        color: ${Colors.BLUE};
        text-decoration: underline;
        font-weight: 600;
        word-break: break-all;
    }
`

export const JoiningInfoCard = ({ classes }: Props) => {
    const [showSnackBar, setShowSnackBar] = useState<boolean>(false)

    const url = window.location.href

    const onEmail = () => {
        var body = `Navigate to ${url} and enter your name to join video session.`
        var mailToLink = 'mailto:?body=' + encodeURIComponent(body)
        window.open(mailToLink, '_blank')
    }

    const onCopy = () => {
        navigator.clipboard.writeText(url)
        setShowSnackBar(true)
    }

    return (
        <>
            <Styles className={classes ?? ''}>
                <div>
                    <span>Navigate to&nbsp;</span>
                    <span className="url">{url}</span>
                    <span>
                        ,&nbsp;and enter your name to join video session.
                    </span>
                </div>

                <Grid className="mt-3" container justifyContent="flex-end">
                    <IconButton classes="mr-3" icon="email" onClick={onEmail} />
                    <IconButton icon="content_copy" onClick={onCopy} />
                </Grid>
            </Styles>

            <Snackbar
                open={showSnackBar}
                handleClose={() => setShowSnackBar(false)}
                variant="info"
                headline="Copied to clipboard"
                message=""
                autoHideDuration={3000}
            />
        </>
    )
}
