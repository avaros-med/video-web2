import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { useAppState } from '../../state'
import IntroContainer from '../IntroContainer/IntroContainer'
import DeviceSelectionScreen from './DeviceSelectionScreen/DeviceSelectionScreen'
import { ErrorScreens } from './ErrorScreens'
import MediaErrorSnackbar from './MediaErrorSnackbar/MediaErrorSnackbar'
import RoomNameScreen from './RoomNameScreen/RoomNameScreen'

export enum Steps {
    roomNameStep,
    deviceSelectionStep,
}

export default function PreJoinScreens() {
    const { user } = useAppState()
    const {
        getAudioAndVideoTracks,
        videoRoom,
        videoRoomStatus,
    } = useVideoContext()
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const [step, setStep] = useState(Steps.roomNameStep)

    const [name, setName] = useState<string>(user?.displayName || '')
    const [pin, setPin] = useState<string>('')
    const [roomName, setRoomName] = useState<string>('')

    const [mediaError, setMediaError] = useState<Error>()

    // The room is ehr's answer for the address's name (VideoProvider): a locked room asks
    // for its PIN; an unknown one, or ehr unreachable, shows the error screen.
    const roomExists =
        videoRoomStatus === 'loading' || videoRoomStatus === 'found'
    const hasPin = !!videoRoom?.isLocked

    useEffect(() => {
        if (URLRoomName) {
            setRoomName(URLRoomName)
            if (user?.displayName) {
                setStep(Steps.deviceSelectionStep)
            }
        }
    }, [user, URLRoomName])

    useEffect(() => {
        if (step === Steps.deviceSelectionStep && !mediaError) {
            getAudioAndVideoTracks().catch(error => {
                console.error('Error acquiring local media:')
                console.dir(error)
                setMediaError(error)
            })
        }
    }, [getAudioAndVideoTracks, step, mediaError])

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        // If this app is deployed as a twilio function, don't change the URL because routing isn't supported.
        if (
            !window.location.origin.includes('twil.io') &&
            // @ts-ignore
            !window.STORYBOOK_ENV
        ) {
            window.history.replaceState(
                null,
                '',
                window.encodeURI(
                    `${process.env.REACT_APP_BASE_HREF}/room/${roomName}${window
                        .location.search || ''}`
                )
            )
        }
        setStep(Steps.deviceSelectionStep)
    }

    const hasError = !!!roomName

    return (
        <IntroContainer>
            <MediaErrorSnackbar error={mediaError} />
            {!hasError && roomExists && (
                <>
                    {step === Steps.roomNameStep && (
                        <RoomNameScreen
                            name={name}
                            pin={pin}
                            hasPin={hasPin}
                            roomName={roomName}
                            setName={setName}
                            setPin={setPin}
                            handleSubmit={handleSubmit}
                        />
                    )}

                    {step === Steps.deviceSelectionStep && (
                        <DeviceSelectionScreen
                            name={name}
                            roomName={roomName}
                            setStep={setStep}
                        />
                    )}
                </>
            )}

            {(hasError || !roomExists) && (
                <ErrorScreens
                    isNotFound={hasError || videoRoomStatus === 'not_found'}
                />
            )}
        </IntroContainer>
    )
}
