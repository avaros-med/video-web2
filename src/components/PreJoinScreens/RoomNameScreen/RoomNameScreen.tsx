import { Spinner, SpinnerSize } from '@blueprintjs/core'
import { Grid, InputLabel, Theme, makeStyles } from '@material-ui/core'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { videoService } from '../../../services/http/video.service'
import { CurrentUser } from '../../../services/models/CurrentUser.model'
import { AppLogoBlock } from '../../UI/AppLogoBlock'
import { Button } from '../../UI/Button'
import { Input } from '../../UI/Input'
import { InputMask } from '../../UI/InputMask'
import { FormInputStyles } from '../../UI/styles/FormStyles'
import { AppointmentCard } from '../AppointmentCard'
import { ProviderCard } from '../ProviderCard'

const useStyles = makeStyles((theme: Theme) => ({
    appLogo: {
        width: '50px',
    },
    inputContainer: {
        [theme.breakpoints.down('sm')]: {
            margin: '1.5em 0 2em',
        },
    },
}))

interface RoomNameScreenProps {
    name: string
    roomName: string
    pin: string
    hasPin: boolean
    setName: (name: string) => void
    setPin: (pin: string) => void
    handleSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function RoomNameScreen({
    name,
    roomName,
    pin,
    hasPin,
    setName,
    setPin,
    handleSubmit,
}: RoomNameScreenProps) {
    const classes = useStyles()
    const { currentUser, appointment, isAppointmentLoading } = useVideoContext()
    const [isPinValid, setIsPinValid] = useState<boolean | undefined>(
        !hasPin ? true : undefined
    )
    useEffect(() => setIsPinValid(!hasPin ? true : undefined), [hasPin])

    // Auto-fill participant name from current user
    useEffect(() => {
        if (!currentUser) {
            return
        }
        setName(CurrentUser.getFullName(currentUser))
    }, [currentUser, setName])

    const validatePin = useCallback(async () => {
        if (!roomName) {
            return
        }

        if (!pin) {
            setIsPinValid(false)
        }

        let _isPinValid: boolean | undefined = undefined
        try {
            _isPinValid = await videoService.validatePin(roomName, pin)
        } catch (error) {
            console.error(error)
        }
        setIsPinValid(_isPinValid)
    }, [roomName, pin])

    return (
        <>
            <FormInputStyles>
                <form onSubmit={event => isPinValid && handleSubmit(event)}>
                    <AppLogoBlock classes="mb-4" />
                    {appointment && (
                        <>
                            <AppointmentCard
                                classes="mb-4"
                                appointment={appointment}
                            />
                            <ProviderCard
                                classes="mb-5"
                                appointment={appointment}
                            />
                        </>
                    )}
                    {isAppointmentLoading && (
                        <Spinner size={SpinnerSize.SMALL} />
                    )}

                    <div className={`${classes.inputContainer} mb-4`}>
                        {hasPin && (
                            <div className="mb-3">
                                <InputLabel shrink>PIN</InputLabel>
                                <InputMask
                                    mask="999999"
                                    placeholder="PIN"
                                    value={pin || ''}
                                    onChange={value => setPin(value)}
                                    onBlur={validatePin}
                                    error={
                                        isPinValid === false
                                            ? 'Invalid PIN'
                                            : undefined
                                    }
                                />
                            </div>
                        )}
                        <div className="mb-3">
                            <InputLabel shrink>Your Name</InputLabel>
                            <Input
                                placeholder="Name"
                                value={name}
                                onChange={(_name: string) => setName(_name)}
                            />
                        </div>
                    </div>
                    <Grid container justifyContent="flex-end">
                        <Button
                            type="submit"
                            label="Continue"
                            disabled={!name || !roomName}
                            onClick={(event: any) => {
                                if (!isPinValid) {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setIsPinValid(false)
                                }
                            }}
                        />
                    </Grid>
                </form>
            </FormInputStyles>
        </>
    )
}
