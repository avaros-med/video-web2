import { interval } from 'd3-timer'
import { useEffect, useState } from 'react'
import { AudioTrack, LocalAudioTrack, RemoteAudioTrack } from 'twilio-video'
import useIsTrackEnabled from '../../hooks/useIsTrackEnabled/useIsTrackEnabled'
import useMediaStreamTrack from '../../hooks/useMediaStreamTrack/useMediaStreamTrack'

export function initializeAnalyser(stream: MediaStream) {
    const audioContext = new AudioContext() // Create a new audioContext for each audio indicator
    const audioSource = audioContext.createMediaStreamSource(stream)

    const analyser = audioContext.createAnalyser()
    analyser.smoothingTimeConstant = 0.2
    analyser.fftSize = 256

    audioSource.connect(analyser)

    // Here we provide a way for the audioContext to be closed.
    // Closing the audioContext allows the unused audioSource to be garbage collected.
    stream.addEventListener('cleanup', () => {
        if (audioContext.state !== 'closed') {
            audioContext.close()
        }
    })

    return analyser
}

const isIOS = /iPhone|iPad/.test(navigator.userAgent)

export const useAudioVolume = (audioTrack?: AudioTrack) => {
    const [analyser, setAnalyser] = useState<AnalyserNode>()

    const isTrackEnabled = useIsTrackEnabled(
        audioTrack as LocalAudioTrack | RemoteAudioTrack
    )
    const mediaStreamTrack = useMediaStreamTrack(audioTrack)
    const [volume, setVolume] = useState<number>(0)

    useEffect(() => {
        if (audioTrack && mediaStreamTrack && isTrackEnabled) {
            // Here we create a new MediaStream from a clone of the mediaStreamTrack.
            // A clone is created to allow multiple instances of this component for a single
            // AudioTrack on iOS Safari. We only clone the mediaStreamTrack on iOS.
            let newMediaStream = new MediaStream([
                isIOS ? mediaStreamTrack.clone() : mediaStreamTrack,
            ])

            // Here we listen for the 'stopped' event on the audioTrack. When the audioTrack is stopped,
            // we stop the cloned track that is stored in 'newMediaStream'. It is important that we stop
            // all tracks when they are not in use. Browsers like Firefox don't let you create a new stream
            // from a new audio device while the active audio device still has active tracks.
            const stopAllMediaStreamTracks = () => {
                if (isIOS) {
                    // If we are on iOS, then we want to stop the MediaStreamTrack that we have previously cloned.
                    // If we are not on iOS, then we do not stop the MediaStreamTrack since it is the original and still in use.
                    newMediaStream.getTracks().forEach(track => track.stop())
                }
                newMediaStream.dispatchEvent(new Event('cleanup')) // Stop the audioContext
            }
            audioTrack.on('stopped', stopAllMediaStreamTracks)

            const reinitializeAnalyser = () => {
                stopAllMediaStreamTracks()
                // We only clone the mediaStreamTrack on iOS.
                newMediaStream = new MediaStream([
                    isIOS ? mediaStreamTrack.clone() : mediaStreamTrack,
                ])
                setAnalyser(initializeAnalyser(newMediaStream))
            }

            setAnalyser(initializeAnalyser(newMediaStream))

            // Here we reinitialize the AnalyserNode on focus to avoid an issue in Safari
            // where the analysers stop functioning when the user switches to a new tab
            // and switches back to the app.
            window.addEventListener('focus', reinitializeAnalyser)

            return () => {
                stopAllMediaStreamTracks()
                window.removeEventListener('focus', reinitializeAnalyser)
                audioTrack.off('stopped', stopAllMediaStreamTracks)
            }
        }
    }, [isTrackEnabled, mediaStreamTrack, audioTrack])

    useEffect(() => {
        if (isTrackEnabled && analyser) {
            const sampleArray = new Uint8Array(analyser.frequencyBinCount)

            const timer = interval(() => {
                analyser.getByteFrequencyData(sampleArray)
                let values = 0

                const length = sampleArray.length
                for (let i = 0; i < length; i++) {
                    values += sampleArray[i]
                }

                const _volume = Math.min(
                    14,
                    Math.max(0, Math.log10(values / length / 3) * 7)
                )
                setVolume(_volume)
            }, 100)

            return () => {
                setVolume(0)
                timer.stop()
            }
        }
    }, [isTrackEnabled, analyser])

    return {
        volume,
    }
}
