import { Typography } from '@material-ui/core'
import { makeStyles, Theme } from '@material-ui/core/styles'
import { forwardRef, useImperativeHandle } from 'react'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
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

    // Pass references to parent component
    useImperativeHandle(ref, () => ({
        getName: () => 'Room Info',
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
                remoteParticipants={Array.from(
                    room!.participants.values() ?? []
                )}
            />
        </div>
    )
})
