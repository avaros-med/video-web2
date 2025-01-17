import { makeStyles, Theme } from '@material-ui/core'
import { ReactNode } from 'react'
import { IconButton } from '../UI/IconButton'
import { usePanelContext } from './usePanelContext'

const useStyles = makeStyles((theme: Theme) => {
    return {
        container: {
            width: `${theme.rightPanelWidth}px`,
            margin: '0.5em 2em 2em',
            background: 'white',
            borderRadius: 5,
            position: 'relative',
            right: '0',
            transition: 'right 0.15s ease',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',

            [theme.breakpoints.down('sm')]: {
                width: 'calc(100% - 16px)',
                margin: '8px',
                position: 'absolute',
                top: '0',
                right: '0',
                bottom: '0',
                left: '0',
                opacity: 1,
            },

            '&.is-hidden': {
                position: 'absolute',
                right: '-100%',
                opacity: 0,
                display: 'none',
            },
        },
        header: {
            padding: '1em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 500,
            textTransform: 'uppercase',
        },
        scrollContainer: {
            flex: 1,
            overflowY: 'auto',
        },
    }
})

export const Panel = () => {
    const classes = useStyles()
    const { panelName, panelNode, isHidden, onClose } = usePanelContext().panel

    return (
        <div className={`${classes.container} ${isHidden && 'is-hidden'}`}>
            <PanelHeader title={panelName} onClose={onClose} />
            <div className={classes.scrollContainer}>{panelNode}</div>
        </div>
    )
}

const PanelHeader = ({
    title,
    onClose,
}: {
    title: ReactNode | string
    onClose: () => void
}) => {
    const classes = useStyles()

    return (
        <div className={classes.header}>
            <div>{title}</div>
            <IconButton intent="text" icon="close" onClick={onClose} />
        </div>
    )
}
