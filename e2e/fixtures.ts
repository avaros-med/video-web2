/**
 * Fixtures for video-web2 E2E tests.
 *
 * Uses the real local schedule service (localhost:8810) and Oscar EMR
 * (localhost:8080), both proxied through the CRA dev server (port 3002).
 *
 * The only thing that is still mocked is the Twilio Video SDK: WebRTC
 * media tracks genuinely cannot work in headless Chromium without a real
 * audio/video device. Everything else — token endpoint, SSE stream, Oscar
 * patient/appointment APIs — hits the real local backends.
 *
 * Required local services:
 *   - video-web2 dev server: NODE_OPTIONS=--openssl-legacy-provider PORT=3002 npm start
 *   - Schedule service:      task sv:run -- schedule  (port 8810)
 *   - Oscar EMR:             localhost:8080
 *   - MySQL:                 localhost:3306  (user: avaros, pw: avaros, db: emr)
 */

import { test as base, Page, BrowserContext } from '@playwright/test'
import * as fs from 'fs'
import { AUTH_COOKIE_FILE, OSCAR_CLIENT_ID } from './global-setup'

// ── Config ────────────────────────────────────────────────────────────────────

export const VIDEO_BASE = '/av/video2'
export const API_VIDEO_BASE = '/av/api/schedule-mysql/video'
export const API_OSCAR_BASE = '/oscar/ws/rs/video/v2'

// Must match a real Twilio room that exists (or will be created) locally.
// The schedule service creates rooms — this name just needs to be deterministic.
export const TEST_ROOM = 'e2e-test-room'

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
            videoModule.connect = (_token, _opts) => {
                const room = window.__mockRoom__;
                room.name = window.__E2E_ROOM_NAME__ || room.name;
                return Promise.resolve(room);
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

// ── Test fixture ──────────────────────────────────────────────────────────────

interface VideoFixtures {
    /** Page with Twilio SDK mock + real physician auth cookies injected. */
    mockedPage: Page
}

// ── Auth cookie injection ─────────────────────────────────────────────────────
//
// global-setup logs in to Oscar and writes JSESSIONID + CLIENT_ID to
// AUTH_COOKIE_FILE. We inject those cookies into every test context so that
// requests to the schedule video API pass PhysicianJwtAndJsessionAuth.

function loadAuthCookies(context: BrowserContext) {
    try {
        const raw = fs.readFileSync(AUTH_COOKIE_FILE, 'utf8')
        const { jsessionid, clientId } = JSON.parse(raw) as {
            jsessionid: string
            clientId: string
        }
        return context.addCookies([
            {
                name: 'JSESSIONID',
                value: jsessionid,
                domain: 'localhost',
                path: '/',
                httpOnly: true,
                secure: false,
            },
            {
                name: 'CLIENT_ID',
                value: clientId,
                domain: 'localhost',
                path: '/',
                httpOnly: false,
                secure: false,
            },
        ])
    } catch (e) {
        throw new Error(
            `Auth cookies not found at ${AUTH_COOKIE_FILE}. ` +
                `Make sure global-setup ran successfully (Oscar login). ` +
                `Original error: ${e}`
        )
    }
}

export const test = base.extend<VideoFixtures>({
    mockedPage: async ({ page, context }, use) => {
        await loadAuthCookies(context)
        await page.addInitScript(TWILIO_MOCK_SCRIPT)
        await use(page)
    },
})

export { expect } from '@playwright/test'
