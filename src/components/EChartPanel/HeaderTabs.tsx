import { useEffect, useRef } from 'react'
import styled, { css } from 'styled-components'
import Colors from '../../colors'
import { useEChartContext } from './useEChartContext'
import { HeaderTab } from './useHeaderTabs'

interface Props {
    classes?: string
    showEChartTab: boolean
}

const Styles = styled.div`
    padding: 8px 4px 0 4px;
    display: flex;
    border-bottom: 1px solid ${Colors.BORDER_COLOR};
    overflow: hidden;
`

export const HeaderTabs = ({ classes, showEChartTab }: Props) => {
    const {
        tabs,
        tabSelected,
        setTabSelected,
        setEChartTab,
        setMessagesTab,
    } = useEChartContext().headerTabs
    const hasSetEChartTabRef = useRef<boolean>(false)

    useEffect(() => {
        if (hasSetEChartTabRef.current) {
            return
        }
        if (showEChartTab) {
            setEChartTab()
        } else {
            setMessagesTab()
        }
        hasSetEChartTabRef.current = true
    }, [showEChartTab, setEChartTab, setMessagesTab])

    return (
        <Styles className={classes ?? ''}>
            {tabs?.map((tab: HeaderTab) => (
                <Item
                    key={tab.value}
                    tab={tab}
                    isActive={tab.value === tabSelected.value}
                    onClick={() => setTabSelected(tab)}
                />
            ))}
        </Styles>
    )
}

const ItemStyles = styled.div`
    padding: 12px 16px;
    color: ${Colors.HINT};
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;

    ${props =>
        props.theme.isActive &&
        css`
            background: ${Colors.BLUE}0C;
            color: ${Colors.BLUE};
            position: relative;

            &:before {
                height: 6px;
                content: '';
                position: absolute;
                right: 0;
                bottom: -4px;
                left: 0;
                border-radius: 10px;
                background: ${Colors.BLUE};
            }
        `}

    &:hover {
        cursor: pointer;
        color: ${Colors.BLUE};
    }

    .material-icons {
        font-size: 20px;
    }
`

const Item = ({
    tab,
    isActive,
    onClick,
}: {
    tab: HeaderTab
    isActive: boolean
    onClick: () => void
}) => {
    return (
        <ItemStyles theme={{ isActive }} onClick={onClick}>
            <i className="material-icons mr-2">{tab.iconName}</i>
            <div>{tab.display}</div>
        </ItemStyles>
    )
}
