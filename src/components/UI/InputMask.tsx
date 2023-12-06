import React, { useMemo } from 'react'
import ReactInputMask from 'react-input-mask'
import styled from 'styled-components'
import Colors from '../../colors'
import { FieldError } from '../../lib/field'

interface Props {
    classes?: string
    mask: string | (string | RegExp)[]
    maskPlaceholder?: string | null | undefined
    alwaysShowMask?: boolean
    type?: string
    placeholder?: string
    value: string
    error?: FieldError
    onChange: (value: string) => void
    onBlur?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const Styles = styled.div`
    .invalid-state {
        border: 1px solid ${Colors.RED} !important;
        border-radius: 5px;
    }

    .error {
        margin-top: 4px;
        color: ${() => Colors.RED};
        font-size: 13px;
    }
`

export const InputMask = ({
    classes,
    mask,
    alwaysShowMask,
    maskPlaceholder,
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
            <div className={`input-wrapper ${hasError && 'invalid-state'}`}>
                <ReactInputMask
                    type={type || 'text'}
                    mask={mask}
                    maskPlaceholder={maskPlaceholder || null}
                    placeholder={placeholder}
                    alwaysShowMask={alwaysShowMask || false}
                    value={value}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        onChange(event.target.value)
                    }}
                    onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                        if (onBlur) {
                            onBlur(event)
                        }
                    }}
                />
            </div>

            {hasError && <div className="error">{error}</div>}
        </Styles>
    )
}
