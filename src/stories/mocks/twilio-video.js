import { action } from '@storybook/addon-actions'
import EventEmitter from 'events'
import { SELECTED_BACKGROUND_SETTINGS_KEY } from '../../constants'

Object.defineProperty(navigator, 'permissions', { value: false })

navigator.mediaDevices.enumerateDevices = () => Promise.resolve([])

const oldFetch = window.fetch
window.fetch = (...args) => {
    if (args[0] === '/token') {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ token: 'yay' }),
        })
    } else {
        return oldFetch(...args)
    }
}

// A real, silent MediaStreamTrack so the audio analysers and microphone health
// checks can run against the mock exactly as they do against the SDK.
let silentAudioContext
const createSilentAudioTrack = () => {
    try {
        silentAudioContext = silentAudioContext || new AudioContext()
        return silentAudioContext
            .createMediaStreamDestination()
            .stream.getAudioTracks()[0]
    } catch {
        return undefined
    }
}

let trackSidCounter = 0
const nextTrackSid = kind => `MT-${kind}-${++trackSidCounter}`

// Storybook control: 'both' | 'local' | 'remote' | false. Stalled byte counters
// from room.getStats() make the app raise its "no one can hear you" (local) and
// "you may not be hearing" (remote) notifications after ~9 seconds.
let simulateStalledAudio = false
const stalled = side =>
    simulateStalledAudio === true ||
    simulateStalledAudio === 'both' ||
    simulateStalledAudio === side

// Storybook control: use photos of people instead of coloured placeholders, for
// design reviews. Both are Pexels-licensed (free to use, no attribution required):
//   local  = "Photo of a Doctor Smiling" by Thirdman (pexels.com/photo/4989179)
//   remote = "Smiling Elderly Woman Doing a Peace Sign while Looking at Camera" by Kampus Production (pexels.com/photo/5473381)
// Pexels serves through imgix, so we ask for a 16:9 crop centred on the face.
let personPosters = false
const pexels = (id, extra = '') =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&fit=crop${extra}`
export const LOCAL_PERSON_PHOTO = pexels(4989179)
export const REMOTE_PERSON_PHOTO = pexels(5473381, '&crop=top')

const getRandomColor = () => {
    return Math.floor(Math.random() * 16777215).toString(16)
}

class MockTrack extends EventEmitter {
    constructor(kind) {
        super()
        this.name = kind
        this.kind = kind === 'screen' || kind === 'video' ? 'video' : 'audio'
        this.isEnabled = true
        this.isSwitchedOff = false
        this.backgroundColor = getRandomColor()

        this._dummyAudioEl_ = document.createElement('audio')
        if (this.kind === 'audio') {
            this.mediaStreamTrack = createSilentAudioTrack()
        }
    }

    attach(el) {
        if (this.kind === 'video') {
            el.loop = true
            if (this.name === 'screen') {
                // Change this URL to change the aspect ratio of the image.
                // To use a video source, set the 'el.src' property instead and uncomment el.play() below
                el.poster =
                    'https://dummyimage.com/800x450/c25050/ffffff.png&text=Screen+share'
            } else if (personPosters) {
                el.poster = this.isLocal
                    ? LOCAL_PERSON_PHOTO
                    : REMOTE_PERSON_PHOTO
            } else {
                el.poster = `https://dummyimage.com/800x450/${this.backgroundColor}/ffffff.png&text=Participant`
            }
            try {
                // el.play();
            } catch {}
        } else {
            return this._dummyAudioEl_
        }
    }

    detach(el) {
        if (el?.src) {
            el.src = ''
        }

        if (!el) return [this._dummyAudioEl_]
    }

    disable() {
        this.isEnabled = false
        this.emit('disabled')
    }

    enable() {
        this.isEnabled = true
        this.emit('enabled')
    }

    switchOff() {
        this.isSwitchedOff = true
        this.emit('switchedOff')
    }

    switchOn() {
        this.isSwitchedOff = false
        this.emit('switchedOn')
    }
}

class MockPublication extends EventEmitter {
    constructor(kind) {
        super()
        this.kind = kind === 'screen' || kind === 'video' ? 'video' : 'audio'
        this.track = new MockTrack(kind)
        this.trackName = kind
        this.trackSid = nextTrackSid(kind)
        this.setPriority = () => {}
    }
}

class LocalParticipant extends EventEmitter {
    constructor() {
        super()
        const videoPublication = new MockPublication('video')
        const audioPublication = new MockPublication('audio')
        videoPublication.track.isLocal = true

        this.videoTracks = new Map([['video', videoPublication]])
        this.audioTracks = new Map([['audio', audioPublication]])
        this.tracks = new Map([
            ['video', videoPublication],
            ['audio', audioPublication],
        ])

        this.identity = 'Local Participant'
    }
}

class MockRoom extends EventEmitter {
    name = 'test room'
    participants = new Map()
    dominantSpeaker = null
    state = 'connected'
    localParticipant = new LocalParticipant()
    disconnect = () => {}
    _statsPoll = 0
    getStats = () => {
        this._statsPoll += 1
        const remoteBytes = stalled('remote') ? 1000 : 1000 * this._statsPoll
        const localBytes = stalled('local') ? 1000 : 1000 * this._statsPoll
        const remoteAudioTrackStats = []
        this.participants.forEach(participant => {
            participant.audioTracks.forEach(publication => {
                remoteAudioTrackStats.push({
                    trackSid: publication.trackSid,
                    bytesReceived: remoteBytes,
                })
            })
        })
        const localAudioTrackStats = Array.from(
            this.localParticipant.audioTracks.values()
        ).map(publication => ({
            trackSid: publication.trackSid,
            bytesSent: localBytes,
        }))
        return Promise.resolve([
            { localAudioTrackStats, remoteAudioTrackStats },
        ])
    }
}

const mockRoom = new MockRoom()

class MockParticipant extends EventEmitter {
    constructor(name) {
        super()
        this.identity = name
        this.tracks = new Map([
            ['video', new MockPublication('video')],
            ['audio', new MockPublication('audio')],
        ])
        this.audioTracks = new Map([['audio', this.tracks.get('audio')]])
    }

    publishTrack(kind) {
        if (!this.tracks.get(kind)) {
            const publication = new MockPublication(kind)
            this.tracks.set(kind, publication)
            if (kind === 'audio') this.audioTracks.set('audio', publication)
            this.emit('trackSubscribed', publication.track)
            this.emit('trackPublished', publication)
            mockRoom.emit('trackPublished', publication, this)
        }
    }

    unpublishTrack(kind) {
        const publication = this.tracks.get(kind)
        if (publication) {
            this.tracks.delete(kind)
            if (kind === 'audio') this.audioTracks.delete('audio')
            this.emit('trackUnsubscribed', publication.track)
            this.emit('trackUnpublished', publication)
            mockRoom.emit('trackUnpublished', publication, this)
        }
    }
}

let isConnected = false

export const connect = (...params) => {
    action('Connected to Twilio Video Room')(...params)
    if (!isConnected) {
        isConnected = true
        return new Promise(resolve => {
            setTimeout(() => resolve(mockRoom), 1000)
        })
    } else {
        return Promise.reject('Already connected to mock Twilio Room')
    }
}

const defaults = {
    isSupported: true,
    connect,
}

export default defaults

// Disable conversations
process.env.REACT_APP_DISABLE_TWILIO_CONVERSATIONS = 'true'

// The decorator to be used in ./storybook/preview to apply the mock to all stories
export function decorator(story, { args }) {
    simulateStalledAudio = args.simulateStalledAudio || false
    personPosters = Boolean(args.personPosters)
    // Pre-select background blur so the toolbar button renders in its "on" state.
    try {
        if (args.blurPreview) {
            localStorage.setItem(
                SELECTED_BACKGROUND_SETTINGS_KEY,
                JSON.stringify({ type: 'blur', index: 0 })
            )
        } else {
            localStorage.removeItem(SELECTED_BACKGROUND_SETTINGS_KEY)
        }
    } catch {}
    for (let i = 1; i <= 200; i++) {
        const identity = `test-${i}`

        if (i <= args.participants) {
            if (!mockRoom.participants.has(identity)) {
                const mockParticipant = new MockParticipant(identity)
                mockRoom.participants.set(identity, mockParticipant)
                mockRoom.emit('participantConnected', mockParticipant)
            }
        } else if (mockRoom.participants.has(identity)) {
            const mockParticipant = mockRoom.participants.get(identity)
            mockRoom.participants.delete(identity)
            mockRoom.emit('participantDisconnected', mockParticipant)
        }

        const mockParticipant = mockRoom.participants.get(identity)

        if (mockParticipant) {
            const audioTrack = mockParticipant.tracks.get('audio')?.track
            const videoTrack = mockParticipant.tracks.get('video')?.track

            if (args.presentationParticipant) {
                // The presentationParticipant string can be a comma-delimited list of numbers
                // to simulate multiple users with published presentation tracks.
                const presentationList = args.presentationParticipant.split(',')

                if (presentationList.includes(i.toString())) {
                    mockParticipant.publishTrack('screen')
                } else {
                    mockParticipant.unpublishTrack('screen')
                }
            } else {
                mockParticipant.unpublishTrack('screen')
            }

            if (args.disableAllAudio) {
                audioTrack?.disable()
            } else {
                audioTrack?.enable()
            }

            if (args.disableAllVideo) {
                videoTrack?.disable()
            } else {
                videoTrack?.enable()
            }

            if (args.unpublishAllAudio) {
                mockParticipant.unpublishTrack('audio')
            } else {
                mockParticipant.publishTrack('audio')
            }

            if (args.unpublishAllVideo) {
                mockParticipant.unpublishTrack('video')
            } else {
                mockParticipant.publishTrack('video')
            }

            if (args.switchOffAllVideo) {
                videoTrack?.switchOff()
            } else {
                videoTrack?.switchOn()
            }
        }
    }

    const dominantSpeakerIdentity = `test-${args.dominantSpeaker}`

    if (mockRoom.participants.has(dominantSpeakerIdentity)) {
        const mockParticipant = mockRoom.participants.get(
            dominantSpeakerIdentity
        )
        mockRoom.dominantSpeaker = mockParticipant
        mockRoom.emit('dominantSpeakerChanged', mockParticipant)
    } else {
        mockRoom.dominantSpeaker = null
        mockRoom.emit('dominantSpeakerChanged', null)
    }

    return story()
}
