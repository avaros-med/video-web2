import React, { useState } from 'react'
import useRoomState from '../../hooks/useRoomState/useRoomState'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { usePanelContext } from '../Panel/usePanelContext'
import { MicStatus } from '../VideoProvider/useAudioHealth/useAudioHealth'
import MediaAlertCallout from '../MediaAlertCallout/MediaAlertCallout'

interface AlertCopy {
    title: string
    message: string
}

export const MIC_ALERT_COPY: Record<Exclude<MicStatus, 'ok'>, AlertCopy> = {
    'system-muted': {
        title: 'No one can hear you',
        message: 'Your computer or another app paused your microphone.',
    },
    ended: {
        title: 'Your microphone disconnected',
        message: 'Reconnect to switch to an available microphone.',
    },
    silent: {
        title: 'No sound from your microphone',
        message:
            "Nothing has been picked up for a while. If others can't hear you, reconnect.",
    },
    'not-sending': {
        title: 'No one can hear you',
        message: 'Your microphone stopped sending audio.',
    },
}

export const RECONNECT_MIC_LABEL = 'Reconnect microphone'
export const SCREEN_SHARE_STOPPED_TITLE = 'Screen sharing stopped'
export const SHARE_AGAIN_LABEL = 'Share again'
export const CHECK_SPEAKER_LABEL = 'Check speaker'
export const remoteAudioTitle = (identity: string) =>
    `You may not be hearing ${identity}`
export const REMOTE_AUDIO_MESSAGE =
    'No audio has arrived from them for several seconds. Check your speaker, or ask them to check their microphone.'

const SCREEN_SHARE_NOTICE_MS = 15000
const REMOTE_AUDIO_NOTICE_MS = 20000

/*
 * Surfaces microphone, screen share and remote audio problems as a single callout
 * above the toolbar, pointing at the control that fixes them.
 *
 * Only one is shown at a time, in priority order: microphone (actionable) >
 * screen share stopped > remote audio. A lower-priority alert appears once the
 * higher one is dismissed or resolved. Nothing is shown while the room itself is
 * reconnecting; that banner already explains the situation.
 */
export default function MediaHealthNotifications() {
    const {
        audioHealth,
        screenShareNotice,
        dismissScreenShareNotice,
        toggleScreenShare,
    } = useVideoContext()
    const { showMediaDevices } = usePanelContext().panel
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
            // Already recorded in the diagnostics timeline; the alert stays so the
            // user can try again or pick another device.
        } finally {
            setIsRestarting(false)
        }
    }

    const onShareAgain = () => {
        dismissScreenShareNotice()
        toggleScreenShare()
    }

    const onCheckSpeaker = () => {
        showMediaDevices?.()
        audioHealth.dismissRemoteAudioAlert()
    }

    return (
        <>
            <MediaAlertCallout
                open={showMicAlert}
                tone="error"
                anchor="mic"
                title={micCopy?.title ?? ''}
                message={micCopy?.message}
                action={{
                    label: RECONNECT_MIC_LABEL,
                    busyLabel: 'Reconnecting…',
                    isBusy: isRestarting,
                    onClick: onRestartMic,
                }}
                onClose={audioHealth.dismissMicAlert}
                data-testid="mic-alert"
            />
            <MediaAlertCallout
                open={showScreenShareNotice}
                tone="warning"
                anchor="screenshare"
                title={SCREEN_SHARE_STOPPED_TITLE}
                message={screenShareNotice?.message}
                action={{ label: SHARE_AGAIN_LABEL, onClick: onShareAgain }}
                onClose={dismissScreenShareNotice}
                autoHideMs={SCREEN_SHARE_NOTICE_MS}
                data-testid="screenshare-alert"
            />
            <MediaAlertCallout
                open={showRemoteAudioAlert}
                tone="info"
                anchor="settings"
                title={remoteAudioTitle(
                    audioHealth.remoteAudioAlert?.identity ?? ''
                )}
                message={REMOTE_AUDIO_MESSAGE}
                action={{ label: CHECK_SPEAKER_LABEL, onClick: onCheckSpeaker }}
                onClose={audioHealth.dismissRemoteAudioAlert}
                autoHideMs={REMOTE_AUDIO_NOTICE_MS}
                data-testid="remote-audio-alert"
            />
        </>
    )
}
