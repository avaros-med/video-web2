import styled from 'styled-components'
import Colors from '../../../colors'

export const FormRowStyles = styled.div`
    display: flex;
    align-items: center;
`

export const FormLabelStyles = styled.div`
    min-width: 100px;
    max-width: 100px;
    padding-right: 16px;
    text-align: right;
    font-weight: 500;
`

export const FormInputStyles = styled.div`
    flex: 1;

    .div-input,
    input {
        width: 100%;
        min-height: 42px;
        padding: 12px 16px;
        font-size: 14px;
        border-radius: 5px;
        border: 0;
        background: ${() => Colors.CONTENT_BACKGROUND};

        &.form-control {
            &:focus {
                background: ${() => Colors.CONTENT_BACKGROUND};
                border-color: transparent;
                box-shadow: none;
            }
        }

        &[readonly] {
            background: ${() => Colors.CONTENT_BACKGROUND};
            cursor: default;
        }

        &:hover {
            cursor: pointer;
            background: #efecec;
        }
    }
`
