import { Spinner, SpinnerSize } from '@blueprintjs/core'
import { Grid, InputLabel, makeStyles, Theme } from '@material-ui/core'
import { FormEvent, useEffect } from 'react'
import { useHttpAppointment } from '../../../hooks/useHttpAppointment'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { CurrentUser } from '../../../services/models/CurrentUser.model'
import { AppLogoBlock } from '../../UI/AppLogoBlock'
import { Button } from '../../UI/Button'
import { Input } from '../../UI/Input'
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
    setName: (name: string) => void
    handleSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function RoomNameScreen({
    name,
    roomName,
    setName,
    handleSubmit,
}: RoomNameScreenProps) {
    const classes = useStyles()
    const { currentUser } = useVideoContext()
    const {
        appointment,
        isLoading: isAppointmentLoading,
        getAppointmentByRoomName,
    } = useHttpAppointment()

    // Auto-fill participant name from current user
    useEffect(() => {
        if (!currentUser) {
            return
        }
        setName(CurrentUser.getFullName(currentUser))
    }, [currentUser, setName])

    // Get appointment details on load
    useEffect(() => {
        if (!roomName) {
            return
        }
        getAppointmentByRoomName(roomName)
    }, [roomName, getAppointmentByRoomName])

    return (
        <>
            <FormInputStyles>
                <form onSubmit={handleSubmit}>
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
                            onClick={() => {}}
                        />
                    </Grid>
                </form>
            </FormInputStyles>
        </>
    )
}
