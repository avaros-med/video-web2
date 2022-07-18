import { PopoverPosition } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import React, { forwardRef } from 'react'
import styled from 'styled-components'
import Colors from '../../colors'

interface Props {
    classes?: string
    intent?:
        | 'primary'
        | 'text'
        | 'secondary'
        | 'hint'
        | 'orange'
        | 'danger'
        | 'endcall'
    icon: string
    tooltipContent?: string
    tooltipPosition?: PopoverPosition
    disabled?: boolean
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

    &.text {
        color: ${Colors.TEXT};
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
                    // autoFocus={false}
                    // enforceFocus={false}
                    // openOnTargetFocus={false}
                    content={tooltipContent}
                    position={tooltipPosition || 'auto'}
                    usePortal
                >
                    <div>{children}</div>
                </Tooltip2>
            )
        }

        return (
            <Wrapper>
                <Styles
                    theme={{ hasHover: onClick }}
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
