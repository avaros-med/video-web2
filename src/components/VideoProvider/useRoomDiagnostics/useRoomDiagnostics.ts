import { useEffect } from 'react'
import {
    LocalTrackPublication,
    Participant,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Room,
    TwilioError,
} from 'twilio-video'
import { getDeviceInfo } from '../../../utils'
import { diagnosticsService } from '../../../services/diagnostics/diagnostics.service'

/*
 * Feeds room lifecycle, publication, subscription and device events into the
 * diagnostics timeline. Purely observational: it never changes room state.
 */
export default function useRoomDiagnostics(room: Room | null) {
    // Capture twilio-video warnings/errors for the whole session, including the
    // pre-join screens where local tracks are acquired.
    useEffect(() => {
        diagnosticsService.captureSdkLogs()
    }, [])

    useEffect(() => {
        if (!room) return

        const { localParticipant } = room
        diagnosticsService.log('room', 'connected', {
            roomSid: room.sid,
            participantSid: localParticipant?.sid,
            identity: localParticipant?.identity,
            participants: room.participants?.size,
            ...diagnosticsService.getEnvironment(),
        })

        const onReconnecting = (error?: TwilioError) =>
            diagnosticsService.log('room', 'reconnecting', {
                code: error?.code,
                message: error?.message,
            })
        const onReconnected = () =>
            diagnosticsService.log('room', 'reconnected')
        const onDisconnected = (_: Room, error?: TwilioError) =>
            diagnosticsService.log('room', 'disconnected', {
                code: error?.code,
                message: error?.message,
            })
        const onParticipantConnected = (participant: RemoteParticipant) =>
            diagnosticsService.log('room', 'participant-connected', {
                identity: participant.identity,
            })
        const onParticipantDisconnected = (participant: RemoteParticipant) =>
            diagnosticsService.log('room', 'participant-disconnected', {
                identity: participant.identity,
            })
        const onParticipantReconnecting = (participant: RemoteParticipant) =>
            diagnosticsService.log('room', 'participant-reconnecting', {
                identity: participant.identity,
            })
        const onTrackSubscribed = (
            track: RemoteTrack,
            _publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) =>
            diagnosticsService.log('room', 'track-subscribed', {
                identity: participant.identity,
                kind: track.kind,
                name: track.name,
            })
        const onTrackUnsubscribed = (
            track: RemoteTrack,
            _publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) =>
            diagnosticsService.log('room', 'track-unsubscribed', {
                identity: participant.identity,
                kind: track.kind,
                name: track.name,
            })
        const onTrackSwitchedOff = (
            track: RemoteTrack,
            _publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) =>
            diagnosticsService.log('network', 'track-switched-off', {
                identity: participant.identity,
                kind: track.kind,
                name: track.name,
            })
        const onTrackSwitchedOn = (
            track: RemoteTrack,
            _publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) =>
            diagnosticsService.log('network', 'track-switched-on', {
                identity: participant.identity,
                kind: track.kind,
                name: track.name,
            })
        const onDominantSpeakerChanged = (participant: Participant | null) =>
            diagnosticsService.log('network', 'dominant-speaker', {
                identity: participant?.identity ?? null,
            })

        const onLocalTrackPublished = (publication: LocalTrackPublication) =>
            diagnosticsService.log('room', 'local-track-published', {
                kind: publication.kind,
                name: publication.trackName,
            })
        const onLocalTrackUnpublished = (publication: LocalTrackPublication) =>
            diagnosticsService.log('room', 'local-track-unpublished', {
                kind: publication.kind,
                name: publication.trackName,
            })
        const onTrackPublicationFailed = (error: TwilioError) =>
            diagnosticsService.log('room', 'track-publication-failed', {
                code: error.code,
                message: error.message,
            })
        const onNetworkQualityLevelChanged = (level: number) => {
            // Only record degraded levels to keep the timeline readable.
            if (level <= 2) {
                diagnosticsService.log('network', 'local-quality-low', {
                    level,
                })
            }
        }

        room.on('reconnecting', onReconnecting)
        room.on('reconnected', onReconnected)
        room.on('disconnected', onDisconnected)
        room.on('participantConnected', onParticipantConnected)
        room.on('participantDisconnected', onParticipantDisconnected)
        room.on('participantReconnecting', onParticipantReconnecting)
        room.on('trackSubscribed', onTrackSubscribed)
        room.on('trackUnsubscribed', onTrackUnsubscribed)
        room.on('trackSwitchedOff', onTrackSwitchedOff)
        room.on('trackSwitchedOn', onTrackSwitchedOn)
        room.on('dominantSpeakerChanged', onDominantSpeakerChanged)
        localParticipant?.on('trackPublished', onLocalTrackPublished)
        localParticipant?.on('trackUnpublished', onLocalTrackUnpublished)
        localParticipant?.on('trackPublicationFailed', onTrackPublicationFailed)
        localParticipant?.on(
            'networkQualityLevelChanged',
            onNetworkQualityLevelChanged
        )

        return () => {
            room.off('reconnecting', onReconnecting)
            room.off('reconnected', onReconnected)
            room.off('disconnected', onDisconnected)
            room.off('participantConnected', onParticipantConnected)
            room.off('participantDisconnected', onParticipantDisconnected)
            room.off('participantReconnecting', onParticipantReconnecting)
            room.off('trackSubscribed', onTrackSubscribed)
            room.off('trackUnsubscribed', onTrackUnsubscribed)
            room.off('trackSwitchedOff', onTrackSwitchedOff)
            room.off('trackSwitchedOn', onTrackSwitchedOn)
            room.off('dominantSpeakerChanged', onDominantSpeakerChanged)
            localParticipant?.off('trackPublished', onLocalTrackPublished)
            localParticipant?.off('trackUnpublished', onLocalTrackUnpublished)
            localParticipant?.off(
                'trackPublicationFailed',
                onTrackPublicationFailed
            )
            localParticipant?.off(
                'networkQualityLevelChanged',
                onNetworkQualityLevelChanged
            )
        }
    }, [room])

    // Device changes are a common trigger for audio problems (headset connect /
    // disconnect, Bluetooth profile switches, virtual devices installed by other apps).
    useEffect(() => {
        const mediaDevices = navigator.mediaDevices
        if (!mediaDevices?.addEventListener) return

        const onDeviceChange = () => {
            getDeviceInfo()
                .then(info =>
                    diagnosticsService.log('device', 'devicechange', {
                        audioInputs: info.audioInputDevices.length,
                        audioOutputs: info.audioOutputDevices.length,
                        videoInputs: info.videoInputDevices.length,
                    })
                )
                .catch(() => diagnosticsService.log('device', 'devicechange'))
        }
        mediaDevices.addEventListener('devicechange', onDeviceChange)
        return () => {
            mediaDevices.removeEventListener('devicechange', onDeviceChange)
        }
    }, [])
}
