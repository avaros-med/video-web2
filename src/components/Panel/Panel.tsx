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

            [theme.breakpoints.down('sm')]: {
                width: '100%',
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
    }
})

export const Panel = () => {
    const classes = useStyles()
    const { panelName, panelNode, isHidden, onClose } = usePanelContext().panel

    return (
        <div className={`${classes.container} ${isHidden && 'is-hidden'}`}>
            <PanelHeader title={panelName} onClose={onClose} />
            {panelNode}
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
