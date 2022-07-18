import { makeStyles, Theme } from '@material-ui/core/styles'
import { forwardRef, useImperativeHandle } from 'react'

interface Props {}

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        width: theme.rightPanelWidth,
        height: `calc(100% - ${theme.footerHeight}px)`,
        padding: '1em',
        display: 'flex',
    },
}))

export const JoiningInfoPanel = forwardRef(({}: Props, ref: any) => {
    const classes = useStyles()

    // Pass references to parent component
    useImperativeHandle(ref, () => ({
        getName: () => 'Joining Info',
    }))

    return (
        <div ref={ref} className={classes.container}>
            <div>Joining Info Panel</div>
        </div>
    )
})
