import styled, { css } from 'styled-components'
import Colors from '../../../colors'
import { HeaderTab } from './useHeaderTabs'

interface Props {
    classes?: string
    tabs: HeaderTab[]
    tabSelected: HeaderTab
    onChange(tabSelected: HeaderTab): void
}

const Styles = styled.div`
    padding: 8px 4px 0 4px;
    display: flex;
    border-bottom: 1px solid ${Colors.BORDER_COLOR};
    overflow: hidden;
`

export const HeaderTabs = ({ classes, tabs, tabSelected, onChange }: Props) => {
    return (
        <Styles className={classes ?? ''}>
            {tabs?.map((tab: HeaderTab) => (
                <Item
                    key={tab.value}
                    tab={tab}
                    isActive={tab.value === tabSelected.value}
                    onClick={() => onChange(tab)}
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
            <div>{tab.display}</div>
        </ItemStyles>
    )
}
