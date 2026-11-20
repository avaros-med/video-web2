import { ChangeEvent, useCallback, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { videoService } from '../../../services/http/video.service'
import { utilsService } from '../../../services/utils.service'
import Snackbar from '../../Snackbar/Snackbar'
import { IconButton } from '../../UI/IconButton'

interface Props {
    classes?: string
}

const ACCEPTED_UPLOAD_TYPES =
    'image/png,image/x-png,image/gif,image/jpeg,image/jpg,application/pdf'
/** ehr keeps a file offered in the room for one download, at most 10 MB. */
export const FILE_MAX_SIZE_IN_MB = 10

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

/**
 * A file from this device, offered in the room through ehr: everyone else in the room
 * may download it once, within 10 minutes. The visit log notes it.
 */
export const SendPatientAttachment = ({ classes }: Props) => {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const { room } = useVideoContext()
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const clearInput = () => {
        if (inputRef?.current) {
            inputRef.current.value = ''
        }
    }

    const onSend = useCallback(
        async (file: File) => {
            if (!URLRoomName || !room) {
                return
            }
            try {
                await videoService.offerFile(
                    URLRoomName,
                    file,
                    room.localParticipant.identity
                )
            } catch (sendError) {
                console.error('Could not send the file', sendError)
                setError('The file was not sent. Please try again.')
                return
            }
            try {
                await videoService.logVisit(
                    URLRoomName,
                    utilsService.sessionStartedAt(),
                    `Patient sent file: ${file.name}`
                )
            } catch (logError) {
                console.error(logError)
            }
        },
        [URLRoomName, room]
    )

    const onChangeHandler = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event?.target?.files?.[0]
            clearInput()
            if (!file) {
                return
            }
            if (
                !file.type?.length ||
                ACCEPTED_UPLOAD_TYPES.indexOf(file.type) === -1
            ) {
                setError('Only images and PDF files can be sent.')
                return
            }
            if (file.size > 1048576 * FILE_MAX_SIZE_IN_MB) {
                setError(`Files can be at most ${FILE_MAX_SIZE_IN_MB} MB.`)
                return
            }
            onSend(file)
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
            <Snackbar
                open={!!error}
                handleClose={() => setError(null)}
                variant="error"
                headline="File not sent"
                message={error ?? ''}
                autoHideDuration={4000}
            />
        </Styles>
    )
}
