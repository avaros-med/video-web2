import { ChangeEvent, useCallback, useRef, useState } from 'react'
import styled from 'styled-components'
import { IconButton } from '../../UI/IconButton'

interface Props {
    classes?: string
}

const ACCEPTED_UPLOAD_TYPES =
    'image/png,image/x-png,image/gif,image/jpeg,image/jpg,application/pdf'
const FILE_MAX_SIZE_IN_MB = 100

const Styles = styled.div`
    position: relative;

    input[type='file'] {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 1;
        opacity: 0;

        &:hover {
            cursor: pointer;
        }
    }

    &:hover {
        cursor: pointer;
    }
`

export const SendPatientAttachment = ({ classes }: Props) => {
    const [file, setFile] = useState<File | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const clearInput = () => {
        // Clear input field
        if (inputRef?.current) {
            inputRef.current.value = ''
        }
    }

    const onChangeHandler = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            if (event?.target?.files?.length) {
                const _file = event.target.files[0]
                if (_file) {
                    // Check file type
                    if (
                        !_file.type?.length ||
                        ACCEPTED_UPLOAD_TYPES.indexOf(_file.type) === -1
                    ) {
                        clearInput()
                        return
                    }

                    // Check file size
                    if (_file.size > 1048576 * FILE_MAX_SIZE_IN_MB) {
                        clearInput()
                        return
                    }

                    setFile(_file)
                    clearInput()
                }
            }
        },
        []
    )

    return (
        <Styles className={classes ?? ''}>
            <IconButton
                intent="primary-fade"
                icon="attachment"
                onClick={() => {}}
            />
            <input
                ref={inputRef}
                type="file"
                onChange={onChangeHandler}
                accept={ACCEPTED_UPLOAD_TYPES}
            />
        </Styles>
    )
}
