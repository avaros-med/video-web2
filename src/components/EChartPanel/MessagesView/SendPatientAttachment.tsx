import { ChangeEvent, useCallback, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { utilsService } from '../../../services/utils.service'
import { SendAttachmentRequest } from '../../../services/ws/eventout'
import { socketService } from '../../../services/ws/socket.service'
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
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const { room } = useVideoContext()
    const [, setFile] = useState<File | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const localParticipantName = useMemo(
        (): string => room?.localParticipant.identity ?? '',
        [room]
    )

    const clearInput = () => {
        // Clear input field
        if (inputRef?.current) {
            inputRef.current.value = ''
        }
    }

    const onSend = useCallback(
        async (_file: File) => {
            const fileContent = await utilsService.getFileContent(_file)
            if (!fileContent) {
                return
            }

            const eventout: SendAttachmentRequest = {
                ID: utilsService.getRandomNumber(100000, 999999),
                name: _file.name,
                type: 'document',
                demographicName: localParticipantName,
                roomName: URLRoomName!,
                fromProvider: false,
                senderName: localParticipantName,
                bytes: fileContent,
            }
            socketService.dispatchEvent('SendAttachmentRequest', eventout)
        },
        [URLRoomName, localParticipantName]
    )

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

                    // Send file
                    onSend(_file)
                }
            }
        },
        [onSend]
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
