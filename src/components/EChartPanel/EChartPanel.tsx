import { Grid } from '@material-ui/core'
import { makeStyles, Theme } from '@material-ui/core/styles'
import { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react'
import { HeaderTabs } from './HeaderTabs'
import { useEChartContext } from './useEChartContext'

interface Props {
    showEChartTab: boolean
}

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        height: `calc(100% - ${theme.footerHeight}px)`,
        padding: '1em',
        display: 'flex',
    },
    headerContainer: {
        margin: '-1em',
    },
}))

export const EChartPanel = forwardRef(({ showEChartTab }: Props, ref: any) => {
    const classes = useStyles()
    const { tabSelected } = useEChartContext().headerTabs

    const canSeeEChartPanel = useMemo((): boolean => true, [])

    const getHeaderNode = useCallback(() => {
        return (
            <HeaderTabs
                showEChartTab={showEChartTab}
                classes={classes.headerContainer}
            />
        )
    }, [showEChartTab, classes.headerContainer])

    // Pass references to parent component
    useImperativeHandle(ref, () => ({
        getName: () => (
            <Grid container alignItems="center">
                <i className="material-icons mr-2">chat</i>
                <span>Messages</span>
            </Grid>
        ),
        getHeaderNode: canSeeEChartPanel ? getHeaderNode : undefined,
    }))

    return (
        <div ref={ref} className={classes.container}>
            <div>eChart Panel; tabSelected: {tabSelected.display}</div>
        </div>
    )
})
