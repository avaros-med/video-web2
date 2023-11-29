import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import clsx from 'clsx'
import React from 'react'
import {
    LocalAudioTrack,
    LocalVideoTrack,
    Participant,
    RemoteAudioTrack,
    RemoteVideoTrack,
} from 'twilio-video'

import Typography from '@material-ui/core/Typography'
import ScreenShareIcon from '../../icons/ScreenShareIcon'
import AudioLevelIndicator from '../AudioLevelIndicator/AudioLevelIndicator'
import NetworkQualityLevel from '../NetworkQualityLevel/NetworkQualityLevel'
import PinIcon from './PinIcon/PinIcon'

import Colors from '../../colors'
import useIsTrackSwitchedOff from '../../hooks/useIsTrackSwitchedOff/useIsTrackSwitchedOff'
import useParticipantIsReconnecting from '../../hooks/useParticipantIsReconnecting/useParticipantIsReconnecting'
import usePublications from '../../hooks/usePublications/usePublications'
import useTrack from '../../hooks/useTrack/useTrack'
import { useAppState } from '../../state'
import { Avatar } from '../UI/Avatar'
import { ParticipantInfoMenu } from './ParticipantInfoMenu'
import { useAudioVolume } from './useAudioVolume'

const borderWidth = 2

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        container: {
            isolation: 'isolate',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            height: 0,
            overflow: 'hidden',
            marginBottom: '0.5em',
            '& video': {
                objectFit: 'contain !important',
            },
            borderRadius: '4px',
            border: `${theme.participantBorderWidth}px solid rgb(245, 248, 255)`,
            paddingTop: `calc(${(9 / 16) * 100}% - ${
                theme.participantBorderWidth
            }px)`,
            background: '#333333',
            [theme.breakpoints.down('sm')]: {
                height: theme.sidebarMobileHeight,
                width: `${(theme.sidebarMobileHeight * 16) / 9}px`,
                marginRight: '8px',
                marginBottom: '0',
                fontSize: '12px',
                paddingTop: `${theme.sidebarMobileHeight - 2}px`,
            },
        },
        innerContainer: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
        },
        infoContainer: {
            position: 'absolute',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            width: '100%',
            background: 'transparent',
            top: 0,
            border: `4px solid black`,
            transition: 'border 0.5s ease',

            '&.is-speaking': {
                borderColor: `${Colors.BLUE}`,
            },
        },
        avatarContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#333333',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 1,
            [theme.breakpoints.down('sm')]: {
                '& svg': {
                    transform: 'scale(0.7)',
                },
            },
        },
        reconnectingContainer: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(40, 42, 43, 0.75)',
            zIndex: 1,
        },
        screenShareIconContainer: {
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '0.18em 0.3em',
            marginRight: '0.3em',
            display: 'flex',
            '& path': {
                fill: 'white',
            },
        },
        identity: {
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '0.18em 0.3em 0.18em 0',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
        },
        infoRowBottom: {
            display: 'flex',
            justifyContent: 'space-between',
            position: 'absolute',
            bottom: 0,
            left: 0,
        },
        typography: {
            color: 'white',
            [theme.breakpoints.down('sm')]: {
                fontSize: '0.75rem',
            },
        },
        hideParticipant: {
            display: 'none',
        },
        cursorPointer: {
            cursor: 'pointer',
        },
        galleryView: {
            border: `${theme.participantBorderWidth}px solid ${theme.galleryViewBackgroundColor}`,
            borderRadius: '8px',
            [theme.breakpoints.down('sm')]: {
                position: 'relative',
                width: '100%',
                height: '100%',
                padding: '0',
                fontSize: '12px',
                margin: '0',
                '& video': {
                    objectFit: 'cover !important',
                },
            },
        },
        dominantSpeaker: {
            border: `solid ${borderWidth}px #7BEAA5`,
        },
    })
)

interface ParticipantInfoProps {
    participant: Participant
    children: React.ReactNode
    onClick?: () => void
    isSelected?: boolean
    isLocalParticipant?: boolean
    hideParticipant?: boolean
    isDominantSpeaker?: boolean
}

export default function ParticipantInfo({
    participant,
    onClick,
    isSelected,
    children,
    isLocalParticipant,
    hideParticipant,
    isDominantSpeaker,
}: ParticipantInfoProps) {
    const publications = usePublications(participant)

    const audioPublication = publications.find(p => p.kind === 'audio')
    const videoPublication = publications.find(
        p => !p.trackName.includes('screen') && p.kind === 'video'
    )

    const isVideoEnabled = Boolean(videoPublication)
    const isScreenShareEnabled = publications.find(p =>
        p.trackName.includes('screen')
    )

    const videoTrack = useTrack(videoPublication)
    const isVideoSwitchedOff = useIsTrackSwitchedOff(
        videoTrack as LocalVideoTrack | RemoteVideoTrack
    )

    const audioTrack = useTrack(audioPublication) as
        | LocalAudioTrack
        | RemoteAudioTrack
        | undefined
    const { volume } = useAudioVolume(audioTrack)
    const isSpeaking = volume > 0
    const isParticipantReconnecting = useParticipantIsReconnecting(participant)

    const { isGalleryViewActive } = useAppState()

    const classes = useStyles()

    return (
        <div
            className={clsx(classes.container, {
                [classes.hideParticipant]: hideParticipant,
                [classes.cursorPointer]: Boolean(onClick),
                [classes.dominantSpeaker]: isDominantSpeaker,
                [classes.galleryView]: isGalleryViewActive,
            })}
            onClick={onClick}
            data-cy-participant={participant.identity}
        >
            <div
                className={`${classes.infoContainer} ${
                    isSpeaking ? 'is-speaking' : ''
                }`}
            >
                <NetworkQualityLevel participant={participant} />
                <div className={classes.infoRowBottom}>
                    {isScreenShareEnabled && (
                        <span className={classes.screenShareIconContainer}>
                            <ScreenShareIcon />
                        </span>
                    )}
                    <ParticipantInfoMenu
                        participantId={participant.sid}
                        isLocalParticipant={isLocalParticipant}
                    >
                        <span className={classes.identity}>
                            <AudioLevelIndicator audioTrack={audioTrack} />
                            <Typography
                                variant="body1"
                                className={classes.typography}
                                component="span"
                            >
                                {participant.identity}
                                {isLocalParticipant && ' (You)'}
                            </Typography>
                        </span>
                    </ParticipantInfoMenu>
                </div>
                <div>{isSelected && <PinIcon />}</div>
            </div>
            <div className={classes.innerContainer}>
                {(!isVideoEnabled || isVideoSwitchedOff) && (
                    <div className={classes.avatarContainer}>
                        <Avatar intent="lg" name={participant.identity} />
                    </div>
                )}
                {isParticipantReconnecting && (
                    <div className={classes.reconnectingContainer}>
                        <Typography
                            variant="body1"
                            className={classes.typography}
                        >
                            Reconnecting...
                        </Typography>
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}
