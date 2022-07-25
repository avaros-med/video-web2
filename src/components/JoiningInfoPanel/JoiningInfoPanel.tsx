import { Grid, Typography } from '@material-ui/core'
import { makeStyles, Theme } from '@material-ui/core/styles'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { RemoteParticipant } from 'twilio-video'
import useParticipantsContext from '../../hooks/useParticipantsContext/useParticipantsContext'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { usePagination } from '../GalleryView/usePagination/usePagination'
import { JoiningInfoCard } from '../UI/JoiningInfoCard'
import { ParticipantsList } from './ParticipantsList'

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        height: `calc(100% - ${theme.footerHeight}px)`,
        padding: '1em',
    },
    headline: {
        marginTop: '2em',
        fontSize: '1rem',
        '&:first-child': {
            marginTop: '0',
        },
    },
    joiningInfoCardContainer: {
        margin: '0.5em 0 1em',
    },
}))

export const JoiningInfoPanel = forwardRef((_, ref: any) => {
    const classes = useStyles()

    const { room } = useVideoContext()
    const { galleryViewParticipants } = useParticipantsContext()
    const [remoteParticipants, setRemoteParticipants] = useState<
        RemoteParticipant[]
    >(Array.from(room!.participants.values() ?? []))
    const { paginatedParticipants } = usePagination([
        room!.localParticipant,
        ...galleryViewParticipants,
    ])

    // Get latest remote participants
    useEffect(() => {
        const newList = Array.from(room!.participants.values() ?? [])
        if (newList?.length === remoteParticipants?.length) {
            return
        }
        setRemoteParticipants(Array.from(room!.participants.values() ?? []))
    }, [room, remoteParticipants, paginatedParticipants])

    // Pass references to parent component
    useImperativeHandle(ref, () => ({
        getName: () => (
            <Grid container alignItems="center">
                <i className="material-icons mr-2">info</i>
                <span>Room Info</span>
            </Grid>
        ),
    }))

    return (
        <div ref={ref} className={classes.container}>
            <Typography variant="h6" className={classes.headline}>
                Joining Instructions
            </Typography>
            <JoiningInfoCard classes={classes.joiningInfoCardContainer} />
            <Typography variant="h6" className={classes.headline}>
                Participants
            </Typography>
            <ParticipantsList
                localParticipant={room!.localParticipant}
                remoteParticipants={remoteParticipants}
            />
        </div>
    )
})
