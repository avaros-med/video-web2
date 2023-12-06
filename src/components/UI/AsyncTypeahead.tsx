import {
    forwardRef,
    ReactNode,
    useCallback,
    useImperativeHandle,
    useMemo,
    useRef,
} from 'react'
import { AsyncTypeahead as LibAsyncTypeahead } from 'react-bootstrap-typeahead'
import styled from 'styled-components'
import Colors from '../../colors'
import { FieldError } from '../../lib/field'

interface Props {
    id: string
    classes?: string
    isLoading: boolean
    selected: any[] | undefined
    options: any[]
    placeholder?: string
    error?: FieldError
    hideArrow?: boolean
    emptyLabel?: ReactNode
    iconName?: string
    iconColor?: string
    labelKey: (option: any) => string
    filterBy?: (option: any) => boolean
    onSearch: (searchTerm: string) => void
    onChange: (selected: any[]) => void
    onBlur?: (...args: any) => void
    onInputCleared?: () => void
    renderMenuItemChildren?: (option: any) => ReactNode
}

const Styles = styled.div`
    position: relative;
    border-radius: 5px;

    .invalid-state {
        border: 1px solid ${Colors.RED} !important;
        border-radius: 5px;
    }

    .rbt {
        border-radius: 5px;
    }

    .arrow {
        position: absolute;
        top: 12px;
        right: 8px;
    }

    .error {
        margin-top: 4px;
        color: ${() => Colors.RED};
        font-size: 13px;
    }
`

export const AsyncTypeahead = forwardRef((props: Props, ref: any) => {
    const elRef = useRef<any>(null)

    const hasError = useMemo(() => props.error && props.error.length > 0, [
        props.error,
    ])

    const clearInput = useCallback(() => {
        if (elRef?.current?.clear) {
            elRef.current.clear()
        }
    }, [])

    // Pass references to parent component
    useImperativeHandle(ref, () => ({
        clearInput() {
            return clearInput()
        },
    }))

    return (
        <Styles className={props.classes || ''}>
            <div
                className={`input-wrapper d-flex align-items-center ${hasError &&
                    'invalid-state'}`}
            >
                {props.iconName && (
                    <i
                        className={`left-icon material-icons md-18 ${props.iconColor ||
                            'color-text-hint'}`}
                    >
                        {props.iconName}
                    </i>
                )}

                <LibAsyncTypeahead
                    id={props.id}
                    ref={elRef}
                    placeholder={props.placeholder ?? ''}
                    isLoading={props.isLoading}
                    labelKey={props.labelKey}
                    filterBy={props.filterBy}
                    onSearch={props.onSearch}
                    onChange={props.onChange}
                    onBlur={(...args: any) => {
                        if (props.onBlur) {
                            props.onBlur(args)
                        }
                    }}
                    onInputChange={(text: string) => {
                        if (!text?.length) {
                            if (props.onInputCleared) {
                                props.onInputCleared()
                            }
                        }
                    }}
                    selected={props.selected}
                    options={props.options}
                    emptyLabel={props.emptyLabel ?? <>No matches found</>}
                    renderMenuItemChildren={
                        props.renderMenuItemChildren ?? undefined
                    }
                />
                {!props.hideArrow && (
                    <div className="arrow">
                        <i className="material-icons">expand_more</i>
                    </div>
                )}
            </div>

            {hasError && <div className="error">{props.error}</div>}
        </Styles>
    )
})
