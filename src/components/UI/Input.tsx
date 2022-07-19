import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import Colors from '../../colors'
import { FieldError } from '../../lib/field'
import { TextHintStyles } from './styles/styles'

interface Props {
    classes?: string
    type?: string
    placeholder?: string
    multiline?: boolean
    value: string
    error?: FieldError
    isLabel?: boolean
    suffix?: string
    maxChars?: number
    onChange: (value: string) => void
    onBlur?: (
        event:
            | React.ChangeEvent<HTMLInputElement>
            | React.ChangeEvent<HTMLTextAreaElement>
    ) => void
}

const Styles = styled.div`
    .error {
        margin-top: 4px;
        color: ${() => Colors.RED};
        font-size: 13px;
    }

    .suffix {
        margin-left: 4px;
        margin-right: 4px;
        color: ${() => Colors.HINT};
        font-weight: 500;
    }
`

export const Input = ({
    classes,
    type,
    placeholder,
    multiline,
    value,
    isLabel,
    error,
    suffix,
    maxChars,
    onChange,
    onBlur,
}: Props) => {
    const [_value, setValue] = useState<string>(value || '')

    const hasError = useMemo(() => error && error.length > 0, [error])

    const changeHandler = (
        event:
            | React.ChangeEvent<HTMLInputElement>
            | React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        const __value = event.target.value
        if (maxChars && __value?.length > maxChars) {
            return
        }
        onChange(__value)
        setValue(__value)
    }

    return (
        <Styles className={classes || ''}>
            {!isLabel ? (
                <>
                    <div
                        className={`input-wrapper d-flex align-items-center ${hasError &&
                            'invalid-state'}`}
                    >
                        {multiline ? (
                            <>
                                <textarea
                                    placeholder={placeholder || ''}
                                    value={value}
                                    rows={3}
                                    onChange={changeHandler}
                                    onBlur={(
                                        event: React.ChangeEvent<
                                            HTMLTextAreaElement
                                        >
                                    ) => {
                                        if (onBlur) {
                                            onBlur(event)
                                        }
                                    }}
                                ></textarea>

                                {suffix && (
                                    <div className="suffix">{suffix}</div>
                                )}
                            </>
                        ) : (
                            <>
                                <input
                                    type={type || 'text'}
                                    placeholder={placeholder || ''}
                                    value={value}
                                    onChange={changeHandler}
                                    onBlur={(
                                        event: React.ChangeEvent<
                                            HTMLInputElement
                                        >
                                    ) => {
                                        if (onBlur) {
                                            onBlur(event)
                                        }
                                    }}
                                />

                                {suffix && (
                                    <div className="suffix">{suffix}</div>
                                )}
                            </>
                        )}
                    </div>

                    {maxChars !== undefined && (
                        <TextHintStyles className="text-right font-size-14">
                            {`${_value?.length || 0}/${maxChars} Chars`}
                        </TextHintStyles>
                    )}
                </>
            ) : (
                <div className="p-1">{value}</div>
            )}

            {hasError && <div className="error">{error}</div>}
        </Styles>
    )
}
