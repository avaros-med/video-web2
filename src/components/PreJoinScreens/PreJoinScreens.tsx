import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { videoService } from '../../services/http/video.service'
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
    const { getAudioAndVideoTracks } = useVideoContext()
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const [step, setStep] = useState(Steps.roomNameStep)

    const [name, setName] = useState<string>(user?.displayName || '')
    const [pin, setPin] = useState<string>('')
    const [hasPin, setHasPin] = useState<boolean>(false)
    const [roomName, setRoomName] = useState<string>('')

    const [mediaError, setMediaError] = useState<Error>()
    const [roomExists, setRoomExists] = useState<boolean>(true)

    // Validate room name exists
    useEffect(() => {
        if (!URLRoomName) {
            setRoomExists(false)
            return
        }
        videoService
            .validateRoomExists(URLRoomName)
            .then(response => {
                setRoomExists(response.roomExists)
                setHasPin(response.hasPIN)
            })
            .catch(() => setRoomExists(false))
    }, [URLRoomName])

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

            {(hasError || !roomExists) && <ErrorScreens />}
        </IntroContainer>
    )
}
