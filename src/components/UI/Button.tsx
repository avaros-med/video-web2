import { Spinner, SpinnerSize } from '@blueprintjs/core'
import styled from 'styled-components'
import Colors from '../../colors'

export type ButtonIntent =
    | 'primary'
    | 'primary-fade'
    | 'secondary'
    | 'hint'
    | 'danger'
    | 'text-primary'
    | 'text-secondary'
    | 'text-white'
    | 'text-hint'
    | 'text-danger'
    | 'text-orange'

interface Props {
    classes?: string
    label: string
    leftIconName?: string
    rightIconName?: string
    intent?: ButtonIntent
    type?: 'button' | 'submit' | 'reset' | undefined
    disabled?: boolean
    isLoading?: boolean
    onClick: (event: any) => void
}

const ButtonStyles = styled.button`
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 5px;
    text-transform: uppercase;
    border: 0;
    display: flex;
    align-items: center;

    &.primary {
        background: ${Colors.BLUE};
        color: white;

        &:hover {
            background: ${Colors.BLUE_TINT};
        }

        .right-count {
            background: ${Colors.ORANGE};
            color: white;
        }
    }

    &.primary-fade {
        background: ${Colors.BLUE}0F;
        color: ${Colors.BLUE};

        &:hover {
            background: ${Colors.BLUE}0F;
        }
    }

    &.text-primary {
        color: ${Colors.BLUE} !important;
        background: transparent;
    }

    &.secondary {
        background: ${Colors.CONTENT_BACKGROUND};
        color: ${Colors.TEXT_SECONDARY};

        &:hover {
            background: #faeded;
        }
    }

    &.text-white {
        color: white;
        background: transparent;
    }

    &.text-secondary {
        color: ${Colors.TEXT_SECONDARY};
        background: transparent;
    }

    &.text-hint {
        color: ${Colors.HINT};
        background: transparent;
    }

    &.text-orange {
        color: ${Colors.ORANGE};
        background: transparent;
    }

    &.text-danger {
        color: ${Colors.RED};
        background: transparent;

        &:hover {
            background: transparent;
        }
    }

    &.hint {
        background: ${Colors.CONTENT_BACKGROUND};
        color: ${Colors.HINT};

        &:hover {
            background: #efecec;
        }
    }

    &.danger {
        background: ${Colors.RED};
        color: white;
    }

    &[disabled] {
        opacity: 0.3;
    }
`

const LeftIconStyles = styled.i`
    margin-right: 8px;
`

const RightIconStyles = styled.i`
    margin-left: 8px;
`

export const Button = ({
    classes,
    label,
    type,
    leftIconName,
    rightIconName,
    intent,
    disabled,
    isLoading,
    onClick,
}: Props) => {
    return (
        <ButtonStyles
            type={type || 'button'}
            className={`${classes || ''} ${intent || 'primary'}`}
            onClick={onClick}
            disabled={disabled}
        >
            {isLoading ? (
                <Spinner size={SpinnerSize.SMALL} />
            ) : (
                <>
                    {leftIconName && (
                        <LeftIconStyles className="material-icons md-18">
                            {leftIconName}
                        </LeftIconStyles>
                    )}

                    <span className="flex-1">{label}</span>

                    {rightIconName && (
                        <RightIconStyles className="material-icons md-18">
                            {rightIconName}
                        </RightIconStyles>
                    )}
                </>
            )}
        </ButtonStyles>
    )
}
