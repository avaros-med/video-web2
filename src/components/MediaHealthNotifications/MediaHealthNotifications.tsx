import React, { useState } from 'react'
import { makeStyles } from '@material-ui/core'
import useRoomState from '../../hooks/useRoomState/useRoomState'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { MicStatus } from '../VideoProvider/useAudioHealth/useAudioHealth'
import Snackbar from '../Snackbar/Snackbar'
import { Button } from '../UI/Button'

const useStyles = makeStyles({
    actionRow: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '0.5em',
    },
})

interface MicCopy {
    headline: string
    message: string
}

export const MIC_ALERT_COPY: Record<Exclude<MicStatus, 'ok'>, MicCopy> = {
    'system-muted': {
        headline: 'Microphone paused:',
        message:
            'Your computer or another application has paused your microphone. If the other participant cannot hear you, click Reconnect microphone.',
    },
    ended: {
        headline: 'Microphone disconnected:',
        message:
            'Your microphone was disconnected. Click Reconnect microphone to switch to an available microphone.',
    },
    silent: {
        headline: 'Microphone check:',
        message:
            'No sound has been detected from your microphone for a while. If the other participant cannot hear you, click Reconnect microphone or choose a different microphone under Media Devices.',
    },
    'not-sending': {
        headline: 'Audio is not reaching the call:',
        message:
            'Your microphone is working but its audio is not being sent. Click Reconnect microphone. If the problem continues, leave and rejoin the call.',
    },
}

export const REMOTE_AUDIO_HEADLINE = 'Audio check:'
export const remoteAudioMessage = (identity: string) =>
    `No audio has been received from ${identity} for several seconds. Check your speaker output under Media Devices, or ask them to check their microphone.`

/*
 * Surfaces microphone, remote audio and screen share problems as snackbars.
 * Mounted once inside the room view, alongside ReconnectingNotification.
 *
 * All snackbars share the top-right corner, so only one is shown at a time, in
 * priority order: microphone (actionable) > screen share stopped > remote audio.
 * A lower-priority alert appears once the higher one is dismissed or resolved.
 * Nothing is shown while the room itself is reconnecting; that banner already
 * explains the situation.
 */
export default function MediaHealthNotifications() {
    const classes = useStyles()
    const {
        audioHealth,
        screenShareNotice,
        dismissScreenShareNotice,
    } = useVideoContext()
    const [isRestarting, setIsRestarting] = useState(false)
    const isRoomReconnecting = useRoomState() === 'reconnecting'

    const micCopy =
        audioHealth.micStatus !== 'ok'
            ? MIC_ALERT_COPY[audioHealth.micStatus]
            : null

    const showMicAlert =
        !isRoomReconnecting && audioHealth.isMicAlertVisible && micCopy !== null
    const showScreenShareNotice =
        !isRoomReconnecting && !showMicAlert && screenShareNotice !== null
    const showRemoteAudioAlert =
        !isRoomReconnecting &&
        !showMicAlert &&
        !showScreenShareNotice &&
        audioHealth.remoteAudioAlert !== null

    const onRestartMic = async () => {
        setIsRestarting(true)
        try {
            await audioHealth.restartMic()
        } catch {
            // Errors are already recorded in the diagnostics timeline; the alert
            // stays visible so the user can try again or pick another device.
        } finally {
            setIsRestarting(false)
        }
    }

    return (
        <>
            <Snackbar
                variant="warning"
                headline={micCopy?.headline ?? ''}
                message={
                    <>
                        {micCopy?.message}
                        <div className={classes.actionRow}>
                            <Button
                                intent="primary"
                                label={
                                    isRestarting
                                        ? 'Reconnecting...'
                                        : 'Reconnect microphone'
                                }
                                disabled={isRestarting}
                                onClick={onRestartMic}
                                data-cy-reconnect-mic
                            />
                        </div>
                    </>
                }
                open={showMicAlert}
                autoHideDuration={null}
                handleClose={audioHealth.dismissMicAlert}
            />
            <Snackbar
                variant="info"
                headline={REMOTE_AUDIO_HEADLINE}
                message={remoteAudioMessage(
                    audioHealth.remoteAudioAlert?.identity ?? ''
                )}
                open={showRemoteAudioAlert}
                autoHideDuration={20000}
                handleClose={audioHealth.dismissRemoteAudioAlert}
            />
            <Snackbar
                variant="warning"
                headline="Screen sharing stopped:"
                message={screenShareNotice?.message ?? ''}
                open={showScreenShareNotice}
                autoHideDuration={15000}
                handleClose={dismissScreenShareNotice}
            />
        </>
    )
}
