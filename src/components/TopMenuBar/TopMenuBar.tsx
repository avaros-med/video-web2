import styled from 'styled-components'
import Colors from '../../colors'
import theme from '../../theme'
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

            &:hover {
                background: ${Colors.BLUE}5F;
            }
        }
    }
`

export const TopMenuBar = () => {
    return (
        <Styles>
            <AppLogoBlock isLight />

            <div className="d-flex align-items-center">
                <IconButton
                    classes="mr-3"
                    intent="text-white"
                    icon="info"
                    onClick={() => {}}
                    tooltipContent={'Joining Info'}
                />
                <Button
                    intent="primary-fade"
                    leftIconName="assignment"
                    label="eChart"
                    onClick={() => {}}
                />
            </div>
        </Styles>
    )
}
