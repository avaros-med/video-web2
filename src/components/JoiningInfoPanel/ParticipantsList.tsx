import { makeStyles, Theme } from '@material-ui/core/styles'
import { Participant, RemoteParticipant } from 'twilio-video'
import Colors from '../../colors'
import { Avatar } from '../UI/Avatar'

interface Props {
    localParticipant: Participant
    remoteParticipants: RemoteParticipant[]
}

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        maxHeight: '400px',
        overflowY: 'auto',
    },
    participantItemContainer: {
        marginTop: '0.5em',
        display: 'flex',
        alignItems: 'center',
    },
    participantItemIsLocalParticipant: {
        marginLeft: '0.5em',
        color: `${Colors.BLUE}`,
        fontWeight: 600,
    },
    avatarContainer: {
        background: `${Colors.BORDER_COLOR} !important`,
    },
}))

export const ParticipantsList = ({
    localParticipant,
    remoteParticipants,
}: Props) => {
    const classes = useStyles()

    return (
        <div className={classes.container}>
            <ParticipantItem
                name={localParticipant.identity}
                isLocalParticipant
            />
            {remoteParticipants.map((participant: Participant) => (
                <ParticipantItem name={participant.identity} />
            ))}
        </div>
    )
}

const ParticipantItem = ({
    name,
    isLocalParticipant,
}: {
    name: string
    isLocalParticipant?: boolean
}) => {
    const classes = useStyles()

    return (
        <div className={classes.participantItemContainer}>
            <Avatar classes={`${classes.avatarContainer} mr-3`} name={name} />
            <span>
                <span>{name}</span>
                {isLocalParticipant && (
                    <span className={classes.participantItemIsLocalParticipant}>
                        (You)
                    </span>
                )}
            </span>
        </div>
    )
}
