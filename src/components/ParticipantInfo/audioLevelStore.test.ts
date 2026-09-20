import {
    getActiveAnalyserCount,
    getSharedAudioContext,
    subscribeToAudioLevel,
} from './audioLevelStore'

const createdContexts: MockAudioContext[] = []

class MockAnalyser {
    smoothingTimeConstant = 0
    fftSize = 256
    frequencyBinCount = 128
    getByteFrequencyData = jest.fn()
    getByteTimeDomainData = jest.fn()
}

class MockSource {
    connect = jest.fn()
    disconnect = jest.fn()
}

class MockAudioContext {
    state = 'running'
    sources: MockSource[] = []
    close = jest.fn()
    resume = jest.fn(() => Promise.resolve())
    createMediaStreamSource = jest.fn(() => {
        const source = new MockSource()
        this.sources.push(source)
        return source
    })
    createAnalyser = jest.fn(() => new MockAnalyser())

    constructor() {
        createdContexts.push(this)
    }
}

class MockMediaStream {
    tracks: any[]
    constructor(tracks: any[]) {
        this.tracks = tracks
    }
    getTracks() {
        return this.tracks
    }
}

const makeTrack = (id: string) => ({ id, stop: jest.fn(), clone: jest.fn() })

describe('the audioLevelStore', () => {
    beforeAll(() => {
        // @ts-ignore
        window.AudioContext = MockAudioContext
        // @ts-ignore
        window.MediaStream = MockMediaStream
    })

    it('should create a single shared AudioContext', () => {
        const first = getSharedAudioContext()
        const second = getSharedAudioContext()
        expect(first).toBe(second)
        expect(createdContexts).toHaveLength(1)
    })

    it('should share one analyser between subscribers of the same track and release it with the last subscriber', () => {
        const track = makeTrack('a') as any
        const subscriberA = jest.fn()
        const subscriberB = jest.fn()

        const unsubscribeA = subscribeToAudioLevel(track, subscriberA)
        const unsubscribeB = subscribeToAudioLevel(track, subscriberB)

        expect(getActiveAnalyserCount()).toBe(1)
        expect(createdContexts).toHaveLength(1)
        expect(
            createdContexts[0].createMediaStreamSource
        ).toHaveBeenCalledTimes(1)
        // Subscribers get the current sample straight away.
        expect(subscriberA).toHaveBeenCalledWith({ volume: 0, isSilent: false })
        expect(subscriberB).toHaveBeenCalledWith({ volume: 0, isSilent: false })

        unsubscribeA()
        expect(getActiveAnalyserCount()).toBe(1)

        unsubscribeB()
        unsubscribeB() // idempotent
        expect(getActiveAnalyserCount()).toBe(0)
        expect(createdContexts[0].sources[0].disconnect).toHaveBeenCalled()
        // The shared context is never closed; closing it is what used to break audio.
        expect(createdContexts[0].close).not.toHaveBeenCalled()
        // Non-iOS: the original track is observed directly and never stopped.
        expect(track.stop).not.toHaveBeenCalled()
        expect(track.clone).not.toHaveBeenCalled()
    })

    it('should keep one analyser per distinct track', () => {
        const unsubscribeA = subscribeToAudioLevel(
            makeTrack('a') as any,
            jest.fn()
        )
        const unsubscribeB = subscribeToAudioLevel(
            makeTrack('b') as any,
            jest.fn()
        )
        expect(getActiveAnalyserCount()).toBe(2)
        expect(createdContexts).toHaveLength(1)
        unsubscribeA()
        unsubscribeB()
        expect(getActiveAnalyserCount()).toBe(0)
    })
})
