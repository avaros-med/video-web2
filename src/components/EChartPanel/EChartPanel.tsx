import { Grid } from '@material-ui/core'
import { makeStyles, Theme } from '@material-ui/core/styles'
import {
    forwardRef,
    ReactNode,
    useCallback,
    useImperativeHandle,
    useMemo,
} from 'react'
import { EChartView } from './EChartView/EChartView'
import { HeaderTabs } from './HeaderTabs'
import { MessagesView } from './MessagesView/MessagesView'
import { useEChartContext } from './useEChartContext'
import { HEADER_TAB } from './useHeaderTabs'

interface Props {
    showEChartTab: boolean
}

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        height: '100%',
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

    const viewNode = useMemo((): ReactNode => {
        switch (tabSelected.value) {
            case HEADER_TAB.ECHART:
                return <EChartView />

            case HEADER_TAB.MESSAGES:
                return <MessagesView />

            default:
                return null
        }
    }, [tabSelected])

    return (
        <div ref={ref} className={classes.container}>
            {viewNode}
        </div>
    )
})
