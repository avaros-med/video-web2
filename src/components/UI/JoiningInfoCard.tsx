import { useState } from 'react'
import styled from 'styled-components'
import Colors from '../../colors'
import Snackbar from '../Snackbar/Snackbar'

interface Props {
    classes?: string
}

const Styles = styled.div`
    padding: 1em;
    border-radius: 5px;
    background: ${Colors.BORDER_COLOR};
    font-weight: 500;

    &:hover {
        cursor: pointer;
    }

    .url {
        color: ${Colors.BLUE};
        text-decoration: underline;
        font-weight: 600;
    }
`

export const JoiningInfoCard = ({ classes }: Props) => {
    const [showSnackBar, setShowSnackBar] = useState<boolean>(false)

    const url = window.location.href

    const onCopy = () => {
        navigator.clipboard.writeText(url)
        setShowSnackBar(true)
    }

    return (
        <>
            <Styles className={classes ?? ''} onClick={onCopy}>
                <span>Navigate to&nbsp;</span>
                <span className="url">{url}</span>
                <span>,&nbsp;and enter your name to join video session.</span>
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
