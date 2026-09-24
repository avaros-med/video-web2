import { interval, Timer } from 'd3-timer'

/*
 * Shared audio-level analysis for every audio indicator in the app.
 *
 * Previously each indicator created its own AudioContext and AnalyserNode, and
 * rebuilt them on every window focus. With two indicators per participant tile
 * plus the main view, a two-person call ran five AudioContexts and tore them all
 * down and back up whenever focus changed, including the moment the screen-share
 * picker closed. Chrome has a history of dropping capture audio under exactly
 * that kind of churn.
 *
 * This module keeps ONE AudioContext for the page and ONE analyser per
 * MediaStreamTrack, no matter how many components observe it. Observers share a
 * single 100ms sampling timer per track. Analysers are rebuilt on focus only on
 * Safari, which is the browser that needs it.
 */

export interface AudioLevelSample {
    /** 0..14 volume estimate, matching the AudioLevelIndicator scale. */
    volume: number
    /**
     * True when the time-domain signal is exactly flat (digital silence). A live
     * microphone always has a noise floor, so sustained digital silence means the
     * browser is no longer receiving audio from the device.
     */
    isSilent: boolean
}

type Subscriber = (sample: AudioLevelSample) => void

interface Entry {
    stream: MediaStream
    source: MediaStreamAudioSourceNode
    analyser: AnalyserNode
    frequencyData: Uint8Array
    timeDomainData: Uint8Array
    timer: Timer
    last: AudioLevelSample
    subscribers: Set<Subscriber>
}

const SAMPLE_INTERVAL_MS = 100
const MAX_VOLUME = 14
const SILENT_SAMPLE_VALUE = 128 // getByteTimeDomainData centre line

export const isIOS = /iPhone|iPad/.test(navigator.userAgent)
export const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(
    navigator.userAgent
)

let sharedContext: AudioContext | undefined
let isFocusListenerAttached = false
const entries = new Map<MediaStreamTrack, Entry>()

export function getSharedAudioContext(): AudioContext | undefined {
    const AudioContextCtor: typeof AudioContext | undefined =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
    if (!AudioContextCtor) return undefined

    if (!sharedContext || sharedContext.state === 'closed') {
        sharedContext = new AudioContextCtor()
    }
    if (sharedContext.state === 'suspended') {
        // Autoplay policy can leave a context suspended until a user gesture. The
        // user has always clicked "Join" before we get here, so this resolves.
        sharedContext.resume().catch(() => undefined)
    }
    return sharedContext
}

function createAnalyserNodes(context: AudioContext, stream: MediaStream) {
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.smoothingTimeConstant = 0.2
    analyser.fftSize = 256
    source.connect(analyser)
    return { source, analyser }
}

function takeSample(entry: Entry): AudioLevelSample {
    const { analyser, frequencyData, timeDomainData } = entry

    analyser.getByteFrequencyData(frequencyData)
    let total = 0
    for (let i = 0; i < frequencyData.length; i++) {
        total += frequencyData[i]
    }
    const volume = Math.min(
        MAX_VOLUME,
        Math.max(0, Math.log10(total / frequencyData.length / 3) * 7)
    )

    analyser.getByteTimeDomainData(timeDomainData)
    let isSilent = true
    for (let i = 0; i < timeDomainData.length; i++) {
        if (timeDomainData[i] !== SILENT_SAMPLE_VALUE) {
            isSilent = false
            break
        }
    }

    return { volume, isSilent }
}

function buildStream(track: MediaStreamTrack): MediaStream {
    // iOS Safari only lets one analyser observe a track, so we analyse a clone
    // there. Everywhere else we observe the original track directly; cloning and
    // stopping clones has caused audio loss in Chrome in the past.
    return new MediaStream([isIOS ? track.clone() : track])
}

function stopClonedTracks(stream: MediaStream) {
    if (isIOS) {
        stream.getTracks().forEach(track => track.stop())
    }
}

function createEntry(track: MediaStreamTrack): Entry | undefined {
    const context = getSharedAudioContext()
    if (!context) return undefined

    let stream: MediaStream
    let nodes: ReturnType<typeof createAnalyserNodes>
    try {
        stream = buildStream(track)
        nodes = createAnalyserNodes(context, stream)
    } catch (error) {
        // Some environments (or a track that is not a real MediaStreamTrack) cannot
        // be analysed; indicators then simply stay idle rather than crashing the UI.
        console.warn('[avs-video] audio analyser unavailable for track', error)
        return undefined
    }
    const { source, analyser } = nodes
    const entry: Entry = {
        stream,
        source,
        analyser,
        frequencyData: new Uint8Array(analyser.frequencyBinCount),
        timeDomainData: new Uint8Array(analyser.fftSize),
        timer: null!,
        last: { volume: 0, isSilent: false },
        subscribers: new Set(),
    }
    entry.timer = interval(() => {
        entry.last = takeSample(entry)
        entry.subscribers.forEach(subscriber => subscriber(entry.last))
    }, SAMPLE_INTERVAL_MS)

    entries.set(track, entry)
    ensureFocusListener()
    return entry
}

function destroyEntry(track: MediaStreamTrack) {
    const entry = entries.get(track)
    if (!entry) return
    entry.timer.stop()
    entry.source.disconnect()
    stopClonedTracks(entry.stream)
    entries.delete(track)
}

/**
 * Rebuilds the analyser nodes for a track on the shared context. Safari stops
 * feeding analysers after a tab is backgrounded, so this is called on focus there.
 */
export function reinitializeAnalyser(track: MediaStreamTrack) {
    const entry = entries.get(track)
    const context = getSharedAudioContext()
    if (!entry || !context) return

    entry.source.disconnect()
    if (isIOS) {
        stopClonedTracks(entry.stream)
        entry.stream = buildStream(track)
    }
    const { source, analyser } = createAnalyserNodes(context, entry.stream)
    entry.source = source
    entry.analyser = analyser
}

function ensureFocusListener() {
    if (!isSafari || isFocusListenerAttached) return
    window.addEventListener('focus', () => {
        entries.forEach((_, track) => reinitializeAnalyser(track))
    })
    isFocusListenerAttached = true
}

/**
 * Observe the audio level of a MediaStreamTrack. Multiple subscribers share one
 * analyser. Returns an idempotent unsubscribe function; the analyser is released
 * when the last subscriber leaves.
 */
export function subscribeToAudioLevel(
    track: MediaStreamTrack,
    subscriber: Subscriber
): () => void {
    const entry = entries.get(track) ?? createEntry(track)
    if (!entry) return () => undefined

    entry.subscribers.add(subscriber)
    subscriber(entry.last)

    let isSubscribed = true
    return () => {
        if (!isSubscribed) return
        isSubscribed = false
        entry.subscribers.delete(subscriber)
        if (entry.subscribers.size === 0) {
            destroyEntry(track)
        }
    }
}

/** Number of live analysers. Exposed for tests and diagnostics. */
export function getActiveAnalyserCount(): number {
    return entries.size
}
