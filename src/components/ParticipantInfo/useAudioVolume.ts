import { useEffect, useState } from 'react'
import { AudioTrack, LocalAudioTrack, RemoteAudioTrack } from 'twilio-video'
import useIsTrackEnabled from '../../hooks/useIsTrackEnabled/useIsTrackEnabled'
import useMediaStreamTrack from '../../hooks/useMediaStreamTrack/useMediaStreamTrack'
import { AudioLevelSample, subscribeToAudioLevel } from './audioLevelStore'

/*
 * Subscribes to the shared audio-level store for a track. All the AudioContext
 * and analyser lifecycle lives in audioLevelStore.ts; these hooks only decide
 * when a track should be observed and how to project the sample into state.
 */
function useAudioLevelSample<T>(
    audioTrack: AudioTrack | undefined,
    project: (sample: AudioLevelSample) => T,
    initial: T
): T {
    const isTrackEnabled = useIsTrackEnabled(
        audioTrack as LocalAudioTrack | RemoteAudioTrack | undefined
    )
    const mediaStreamTrack = useMediaStreamTrack(audioTrack)
    const [value, setValue] = useState<T>(initial)

    useEffect(() => {
        if (!audioTrack || !mediaStreamTrack || !isTrackEnabled) {
            setValue(initial)
            return
        }
        const unsubscribe = subscribeToAudioLevel(mediaStreamTrack, sample =>
            setValue(project(sample))
        )
        return () => {
            unsubscribe()
            setValue(initial)
        }
        // `project` and `initial` are stable module-level values at every call site.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioTrack, mediaStreamTrack, isTrackEnabled])

    return value
}

const projectVolume = (sample: AudioLevelSample) => sample.volume
const projectIsSpeaking = (sample: AudioLevelSample) => sample.volume > 0

/** Volume on a 0..14 scale, updated ~10 times per second while the track is enabled. */
export const useAudioVolume = (audioTrack?: AudioTrack) => {
    const volume = useAudioLevelSample(audioTrack, projectVolume, 0)
    return { volume }
}

/**
 * Boolean speaking indicator. Prefer this over useAudioVolume in components that
 * only need to know whether someone is talking: React skips the re-render when the
 * boolean does not change, so the tile no longer re-renders ten times a second.
 */
export const useIsSpeaking = (audioTrack?: AudioTrack) =>
    useAudioLevelSample(audioTrack, projectIsSpeaking, false)
