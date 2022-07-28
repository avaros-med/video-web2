import { Hidden } from '@material-ui/core'
import styled from 'styled-components'
import Colors from '../../colors'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import theme from '../../theme'
import { usePanelContext } from '../Panel/usePanelContext'
import { AppLogoBlock } from '../UI/AppLogoBlock'
import { Button } from '../UI/Button'
import { IconButton } from '../UI/IconButton'

const Styles = styled.div`
    height: ${theme.topMenuBarHeight}px;
    padding: 1.5em 2em 1em;
    display: flex;
    align-items: center;
    justify-content: space-between;

    button {
        &.primary-fade {
            padding: 8px 12px;
            background: ${Colors.BLUE}5F;
            border: 1px solid ${Colors.BLUE}6F;
            color: white;

            &:hover {
                background: ${Colors.BLUE}5F;
            }
        }
    }
`

export const TopMenuBar = () => {
    const { currentUser } = useVideoContext()
    const { showJoiningInfo, showEChart } = usePanelContext().panel

    return (
        <Styles>
            <AppLogoBlock isLight />

            <div className="d-flex align-items-center">
                <Hidden smDown>
                    <IconButton
                        classes="mr-3"
                        intent="text-white"
                        icon="info"
                        onClick={showJoiningInfo}
                        tooltipContent={'Room Info'}
                    />
                </Hidden>
                {currentUser && (
                    <Button
                        intent="primary-fade"
                        leftIconName="assignment"
                        label="eChart"
                        onClick={() => showEChart(true)}
                    />
                )}
            </div>
        </Styles>
    )
}
