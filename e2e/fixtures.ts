/**
 * Fixtures for the end-to-end suite. Everything is real (the room page, ehr, OSCAR, the
 * dev clinic) except the Twilio Video SDK and the camera and microphone: WebRTC media
 * cannot work in headless Chromium. The mock connects to a fake room whose local
 * participant is the identity ehr put in the token.
 *
 * - `ehr`: books what a test needs (e2e/support/ehr.ts) and removes it afterwards.
 * - `visit`: a fresh Video visit with the test patient, its room made by ehr.
 * - `patientPage`: a page with no OSCAR cookies: ehr answers it as the patient.
 * - `providerPage`: a page with the signed-in provider's cookies (the JWT).
 */
import { BrowserContext, Page, test as base } from '@playwright/test'

import { Ehr, VideoVisit } from './support/ehr'
import { settings } from './support/settings'

// ── Twilio Video SDK mock ─────────────────────────────────────────────────────
//
// Injected via page.addInitScript() before the React bundle executes.
//
// useRoom.tsx does `window.TwilioVideo = Video` at module scope (before any
// hook call). We intercept that assignment via Object.defineProperty so that
// the moment the bundle sets window.TwilioVideo we immediately replace
// Video.connect (and Video.Logger) on the same object reference — which is
// the exact same object the `Video.connect(token, ...)` call inside useRoom
// will use. This is the only reliable way to mock the bundled SDK.

export const TWILIO_MOCK_SCRIPT = `
(function() {
    // ── navigator.mediaDevices mock ───────────────────────────────────────────
    // Headless Chromium in WSL2 has no physical camera/mic, so getUserMedia
    // and enumerateDevices fail. Mock them to return silent fake tracks so
    // the DeviceSelectionScreen pre-join step renders normally.
    function makeFakeMediaStreamTrack(kind) {
        return {
            kind, id: 'fake-' + kind + '-' + Math.random().toString(36).slice(2),
            enabled: true, muted: false, readyState: 'live',
            label: kind === 'audio' ? 'Fake Microphone' : 'Fake Camera',
            stop() { this.readyState = 'ended'; },
            clone() { return makeFakeMediaStreamTrack(kind); },
            getSettings()     { return { deviceId: 'fake-' + kind, groupId: 'fake-group', width: 640, height: 480, frameRate: 30 }; },
            getCapabilities() { return {}; },
            getConstraints()  { return {}; },
            applyConstraints() { return Promise.resolve(); },
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() { return true; },
        };
    }
    function makeFakeMediaStream(kinds) {
        const tracks = kinds.map(makeFakeMediaStreamTrack);
        return {
            id: 'fake-stream-' + Math.random().toString(36).slice(2),
            active: true,
            getTracks()      { return tracks; },
            getAudioTracks() { return tracks.filter(t => t.kind === 'audio'); },
            getVideoTracks() { return tracks.filter(t => t.kind === 'video'); },
            getTrackById(id) { return tracks.find(t => t.id === id) || null; },
            addTrack() {},
            removeTrack() {},
            clone() { return makeFakeMediaStream(kinds); },
            addEventListener() {},
            removeEventListener() {},
        };
    }
    const fakeDevices = [
        { deviceId: 'fake-audioinput',  kind: 'audioinput',  label: 'Fake Microphone', groupId: 'fake-group' },
        { deviceId: 'fake-videoinput',  kind: 'videoinput',  label: 'Fake Camera',      groupId: 'fake-group' },
        { deviceId: 'fake-audiooutput', kind: 'audiooutput', label: 'Fake Speaker',     groupId: 'fake-group' },
    ];
    if (!navigator.mediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', { value: {}, writable: true, configurable: true });
    }
    navigator.mediaDevices.getUserMedia    = (constraints) => {
        const kinds = [];
        if (constraints && constraints.audio) kinds.push('audio');
        if (constraints && constraints.video) kinds.push('video');
        return Promise.resolve(makeFakeMediaStream(kinds.length ? kinds : ['audio', 'video']));
    };
    navigator.mediaDevices.enumerateDevices = () => Promise.resolve(fakeDevices);
    navigator.mediaDevices.getDisplayMedia  = () => Promise.resolve(makeFakeMediaStream(['video']));
    if (typeof navigator.mediaDevices.addEventListener !== 'function') {
        navigator.mediaDevices.addEventListener    = () => {};
        navigator.mediaDevices.removeEventListener = () => {};
        navigator.mediaDevices.dispatchEvent       = () => true;
    }

    class MockEmitter {
        constructor() { this._listeners = {}; }
        on(event, fn) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(fn);
            return this;
        }
        off(event, fn) {
            if (this._listeners[event])
                this._listeners[event] = this._listeners[event].filter(f => f !== fn);
            return this;
        }
        emit(event, ...args) {
            (this._listeners[event] || []).forEach(fn => fn(...args));
        }
        once(event, fn) {
            const wrapper = (...args) => { this.off(event, wrapper); fn(...args); };
            return this.on(event, wrapper);
        }
        listenerCount(event) { return (this._listeners[event] || []).length; }
    }

    function makeTrack(kind) {
        const el = document.createElement(kind === 'video' ? 'video' : 'audio');
        return {
            kind, name: kind + '-track', isEnabled: true,
            mediaStreamTrack: {
                kind, enabled: true, stop: () => {},
                getSettings: () => ({}),
                getCapabilities: () => ({}),
                getConstraints: () => ({}),
                applyConstraints: () => Promise.resolve(),
                addEventListener: () => {}, removeEventListener: () => {},
            },
            attach: () => el,
            detach: () => [],
            on: () => {}, off: () => {},
            disable() { this.isEnabled = false; },
            enable()  { this.isEnabled = true;  },
        };
    }

    function makePub(track) {
        return {
            trackName: track.name, track, isSubscribed: true,
            trackSid: 'mock-' + track.kind,
            setPriority: () => {},
            on: () => {}, off: () => {},
        };
    }

    function makeParticipant(identity) {
        const em = new MockEmitter();
        const audioPub = makePub(makeTrack('audio'));
        const videoPub = makePub(makeTrack('video'));
        const tracks      = new Map([[audioPub.trackSid, audioPub], [videoPub.trackSid, videoPub]]);
        const audioTracks = new Map([[audioPub.trackSid, audioPub]]);
        const videoTracks = new Map([[videoPub.trackSid, videoPub]]);
        const participant = Object.assign(em, {
            identity, sid: 'PA' + Math.random().toString(36).slice(2),
            state: 'connected', tracks, audioTracks, videoTracks,
            networkQualityLevel: 5, networkQualityStats: null,
            publishTrack(track, opts) {
                const pub = { track, trackName: opts?.name || track.kind, trackSid: 'mock-' + (opts?.name || track.kind), setPriority: () => {} };
                return Promise.resolve(pub);
            },
            unpublishTrack(track) {},
        });
        return participant;
    }

    function makeMockRoom(roomName) {
        const remoteParticipants = new Map();
        const roomEmitter = new MockEmitter();
        return Object.assign(roomEmitter, {
            name: roomName || 'e2e-test-room',
            sid: 'RM' + Math.random().toString(36).slice(2),
            state: 'connected',
            localParticipant: makeParticipant('test-provider'),
            participants: remoteParticipants,
            setMaxListeners: () => {},
            disconnect() { this.state = 'disconnected'; this.emit('disconnected', this); },
            _addParticipant(identity) {
                const p = makeParticipant(identity);
                remoteParticipants.set(p.sid, p);
                this.emit('participantConnected', p);
                return p;
            },
            _removeParticipant(sid) {
                const p = remoteParticipants.get(sid);
                if (p) { remoteParticipants.delete(sid); this.emit('participantDisconnected', p); }
            },
        });
    }

    // Create initial mock room (room name may be overridden before navigation)
    window.__mockRoom__ = makeMockRoom(window.__E2E_ROOM_NAME__ || 'e2e-test-room');
    window.__makeMockRoom__ = makeMockRoom;

    // Intercept window.TwilioVideo = Video (set at module scope in useRoom.tsx).
    // When the bundle assigns it, we replace .connect on the same object so the
    // hook's direct Video.connect(...) call uses our mock.
    Object.defineProperty(window, 'TwilioVideo', {
        configurable: true,
        set(videoModule) {
            // Patch connect to return our mock room
            videoModule.connect = (token, _opts) => {
                const room = window.__mockRoom__;
                room.name = window.__E2E_ROOM_NAME__ || room.name;
                // The identity ehr put in the token (the name typed and a _123456 suffix):
                // the page sends chat lines and files under it.
                try {
                    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                    room.localParticipant = makeParticipant(payload.grants.identity);
                } catch (e) {}
                return Promise.resolve(room);
            };
            // The screen share wraps its own capture in a LocalVideoTrack
            // (useScreenShareToggle), which the real SDK refuses for a fake track.
            videoModule.LocalVideoTrack = function(mediaStreamTrack, options) {
                const track = makeTrack('video');
                track.name = (options && options.name) || 'video-track';
                track.mediaStreamTrack = mediaStreamTrack;
                track.stop = () => {};
                return track;
            };
            // Silence Logger if present
            if (videoModule.Logger && videoModule.Logger.getLogger) {
                try {
                    const logger = videoModule.Logger.getLogger('twilio-video');
                    if (logger) logger.setLevel('silent');
                } catch (e) {}
            }
            // Make it readable as normal after patching
            Object.defineProperty(window, 'TwilioVideo', {
                value: videoModule, writable: true, configurable: true
            });
        },
        get() { return undefined; }
    });

    // Also mock VideoRoomMonitor (imported alongside Video in useRoom)
    window.__VideoRoomMonitorMock__ = { registerVideoRoom: () => {} };
})();
`

interface VideoFixtures {
    ehr: Ehr
    visit: VideoVisit
    patientPage: Page
    providerPage: Page
}

const mockedPage = async (context: BrowserContext): Promise<Page> => {
    const page = await context.newPage()
    await page.addInitScript(TWILIO_MOCK_SCRIPT)
    return page
}

export const test = base.extend<VideoFixtures>({
    ehr: async ({ playwright }, use) => {
        const ehr = await Ehr.open(playwright.request)
        await use(ehr)
        await ehr.cleanup()
    },
    visit: async ({ ehr }, use) => {
        await use(await ehr.bookVideoVisit())
    },
    patientPage: async ({ browser }, use) => {
        const context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: ['camera', 'microphone'] })
        await use(await mockedPage(context))
        await context.close()
    },
    providerPage: async ({ browser }, use) => {
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            permissions: ['camera', 'microphone'],
            storageState: settings.storageStatePath,
        })
        await use(await mockedPage(context))
        await context.close()
    },
})

export { expect } from '@playwright/test'
