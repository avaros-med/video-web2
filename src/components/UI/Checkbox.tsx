import React, { ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
    classes?: string
    label?: string | ReactNode
    value: string
    onChange: (value: string) => void
}

const Styles = styled.div`
    position: relative;

    input {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        opacity: 0;

        &:hover {
            cursor: pointer;
        }
    }

    .label {
        margin-left: 6px;
    }
`

export const Checkbox = ({ classes, label, value, onChange }: Props) => {
    return (
        <Styles className={classes || ''}>
            <div
                className={`input-wrapper disable-hover d-flex align-items-center`}
            >
                <input
                    type="checkbox"
                    value={value}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        onChange(event.target.value)
                    }
                />

                {value === 'true' ? (
                    <i className="material-icons color-blue">check_box</i>
                ) : (
                    <i className="material-icons">check_box_outline_blank</i>
                )}

                <div className="label">{label}</div>
            </div>
        </Styles>
    )
}
