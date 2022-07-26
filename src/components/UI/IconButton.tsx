import { PopoverPosition } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import React, { forwardRef } from 'react'
import styled, { css } from 'styled-components'
import Colors from '../../colors'

interface Props {
    classes?: string
    intent?:
        | 'primary'
        | 'primary-fade'
        | 'text'
        | 'text-white'
        | 'secondary'
        | 'hint'
        | 'orange'
        | 'danger'
        | 'endcall'
    icon: string
    tooltipContent?: string
    tooltipPosition?: PopoverPosition
    disabled?: boolean
    hasNotification?: boolean
    animateOnNotification?: boolean
    onClick?: (event: React.MouseEvent) => void
    onMouseEnter?: (event: React.MouseEvent) => void
    onMouseLeave?: (event: React.MouseEvent) => void
}

const Styles = styled.div`
    min-width: 40px;
    min-height: 40px;
    max-width: 40px;
    max-height: 40px;
    padding: 4px;
    border-radius: 100%;
    background-color: ${Colors.CONTENT_BACKGROUND};
    border: 1px solid ${Colors.BORDER_COLOR};
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &.primary {
        color: ${Colors.BLUE};
    }

    &.primary-fade {
        background: ${Colors.BLUE}0F;
        color: ${Colors.BLUE};
        border: 0;

        &:hover {
            background: ${Colors.BLUE}0F;
        }
    }

    &.text {
        color: ${Colors.TEXT};
    }

    &.text-white {
        background-color: transparent;
        border-color: transparent;
        color: white;

        &:hover {
            background-color: transparent;
        }
    }

    &.secondary {
        color: ${Colors.TEXT_SECONDARY};
    }

    &.hint {
        color: ${Colors.HINT};
    }

    &.orange {
        color: ${Colors.ORANGE};
    }

    &.danger {
        color: ${Colors.RED};
    }

    &.endcall {
        min-width: 50px;
        max-width: 50px;
        border-radius: 100px;
        background: ${Colors.RED};
        border-color: ${Colors.RED};
        color: white;

        &:hover {
            cursor: ${props => (props.theme.hasHover ? 'pointer' : 'default')};
            background: ${Colors.RED};
        }
    }

    &:hover {
        cursor: ${props => (props.theme.hasHover ? 'pointer' : 'default')};
        background: #efecec;
    }

    ${props =>
        props.theme.hasNotification &&
        css`
            position: relative;

            &:before {
                min-width: 16px;
                min-height: 16px;
                max-width: 16px;
                max-height: 16px;
                border-radius: 100%;
                content: '';
                position: absolute;
                top: -6px;
                right: -4px;
                background: ${Colors.BLUE};
            }
        `}

    ${props =>
        props.theme.animateOnNotification &&
        css`
            -webkit-animation: slide-top 0.4s
                cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite alternate-reverse
                both;
            animation: slide-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)
                infinite alternate-reverse both;
        `}

    @-webkit-keyframes slide-top {
        0% {
            -webkit-transform: translateY(0);
            transform: translateY(0);
        }
        100% {
            -webkit-transform: translateY(-8px);
            transform: translateY(-8px);
        }
    }

    @keyframes slide-top {
        0% {
            -webkit-transform: translateY(0);
            transform: translateY(0);
        }
        100% {
            -webkit-transform: translateY(-8px);
            transform: translateY(-8px);
        }
    }
`

export const IconButton = forwardRef(
    (
        {
            classes,
            intent,
            icon,
            tooltipContent,
            tooltipPosition,
            disabled,
            hasNotification,
            animateOnNotification,
            onClick,
            onMouseEnter,
            onMouseLeave,
        }: Props,
        ref: any
    ) => {
        let Wrapper = ({ children }: { children: React.ReactNode }) => (
            <div>{children}</div>
        )
        if (tooltipContent) {
            Wrapper = ({ children }: { children: React.ReactNode }) => (
                <Tooltip2
                    autoFocus={false}
                    enforceFocus={false}
                    openOnTargetFocus={false}
                    content={tooltipContent}
                    position={tooltipPosition || 'auto'}
                    usePortal={false}
                >
                    <div>{children}</div>
                </Tooltip2>
            )
        }

        return (
            <Wrapper>
                <Styles
                    theme={{
                        hasHover: onClick,
                        hasNotification,
                        animateOnNotification,
                    }}
                    className={`${classes || ''} ${intent || 'primary'}`}
                    onClick={(event: React.MouseEvent) =>
                        !disabled && onClick && onClick(event)
                    }
                    onMouseEnter={(event: React.MouseEvent) =>
                        onMouseEnter && onMouseEnter(event)
                    }
                    onMouseLeave={(event: React.MouseEvent) =>
                        onMouseLeave && onMouseLeave(event)
                    }
                >
                    <i className="material-icons">{icon}</i>
                </Styles>
            </Wrapper>
        )
    }
)
