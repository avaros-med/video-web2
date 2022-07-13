import React, { useMemo } from 'react'
import styled from 'styled-components'
import Colors from '../../colors'
import { FieldError } from '../../lib/field'

interface Props {
    classes?: string
    type?: string
    placeholder?: string
    value: string
    error?: FieldError
    onChange: (value: string) => void
    onBlur?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const Styles = styled.div`
    .error {
        margin-top: 4px;
        color: ${() => Colors.RED};
        font-size: 13px;
    }
`

export const Input = ({
    classes,
    type,
    placeholder,
    value,
    error,
    onChange,
    onBlur,
}: Props) => {
    const hasError = useMemo(() => error && error.length > 0, [error])

    return (
        <Styles className={classes || ''}>
            <input
                className={`${hasError && 'invalid-state'}`}
                type={type || 'text'}
                placeholder={placeholder || ''}
                value={value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onChange(event.target.value)
                }
                onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                    if (onBlur) {
                        onBlur(event)
                    }
                }}
            />

            {hasError && <div className="error">{error}</div>}
        </Styles>
    )
}
