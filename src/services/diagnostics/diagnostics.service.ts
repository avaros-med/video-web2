import Video from 'twilio-video'

/*
 * Client-side diagnostics for a video visit.
 *
 * Keeps an in-memory timeline of notable events (room lifecycle, screen share,
 * microphone health, device changes, SDK warnings) so that:
 *   - support can inspect it live from the browser console via `window.avsDiagnostics`
 *   - the Twilio Room Monitor can be opened alongside it for per-track stats
 *   - a compact summary is attached to the video-visit log that is written to the
 *     ark video service when the call ends (visible in EMR Admin > Video Visit Logs)
 *
 * Nothing here talks to the network on its own. The timeline is bounded so it
 * cannot grow without limit during a long visit.
 */

export type DiagnosticCategory =
    | 'room'
    | 'screenshare'
    | 'mic'
    | 'audio-out'
    | 'device'
    | 'network'
    | 'sdk'
    | 'error'

export interface DiagnosticEvent {
    at: Date
    category: DiagnosticCategory
    name: string
    data?: Record<string, unknown>
}

export interface DiagnosticEnvironment {
    sdkVersion: string
    browser: string
    userAgent: string
    language: string
    screen: string
    hardwareConcurrency?: number
    connectionType?: string
}

type Listener = (event: DiagnosticEvent) => void

const MAX_EVENTS = 400
const SUMMARY_MAX_LINES = 20
const SDK_MESSAGE_MAX_LENGTH = 300
const LOG_PREFIX = '[avs-video]'

// Categories that are worth showing in the end-of-call summary. Network quality
// changes and SDK warnings are kept in the timeline but summarised as counts only.
const SUMMARY_CATEGORIES: DiagnosticCategory[] = [
    'room',
    'screenshare',
    'mic',
    'audio-out',
    'device',
    'error',
]

function describeBrowser(userAgent: string): string {
    const browserMatchers: [string, RegExp][] = [
        ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
        ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
        ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
        ['Safari', /Version\/([\d.]+).*Safari/],
    ]
    const osMatchers: [string, RegExp][] = [
        ['iOS', /iPhone|iPad/],
        ['Android', /Android/],
        ['Windows', /Windows/],
        ['macOS', /Mac OS X/],
        ['Linux', /Linux/],
    ]

    let browser = 'Unknown browser'
    for (const [name, matcher] of browserMatchers) {
        const match = userAgent.match(matcher)
        if (match) {
            browser = `${name} ${match[1].split('.')[0]}`
            break
        }
    }

    let os = ''
    for (const [name, matcher] of osMatchers) {
        if (matcher.test(userAgent)) {
            os = name
            break
        }
    }

    return os ? `${browser} on ${os}` : browser
}

function formatTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds()
    )}`
}

function formatData(data?: Record<string, unknown>): string {
    if (!data) return ''
    const parts = Object.keys(data)
        .filter(key => data[key] !== undefined && data[key] !== null)
        .map(key => `${key}=${String(data[key])}`)
    return parts.length ? ` (${parts.join(', ')})` : ''
}

export class DiagnosticsService {
    private events: DiagnosticEvent[] = []
    private listeners = new Set<Listener>()
    private isSdkLoggerHooked = false

    /**
     * Records an event on the timeline and echoes it to the browser console.
     */
    log(
        category: DiagnosticCategory,
        name: string,
        data?: Record<string, unknown>
    ): DiagnosticEvent {
        return this.record({ at: new Date(), category, name, data }, true)
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }

    getEvents(): DiagnosticEvent[] {
        return [...this.events]
    }

    clear(): void {
        this.events = []
    }

    getEnvironment(): DiagnosticEnvironment {
        const nav = navigator as Navigator & {
            connection?: { effectiveType?: string }
        }
        return {
            sdkVersion: Video.version,
            browser: describeBrowser(nav.userAgent),
            userAgent: nav.userAgent,
            language: nav.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            hardwareConcurrency: nav.hardwareConcurrency,
            connectionType: nav.connection?.effectiveType,
        }
    }

    /**
     * Routes twilio-video's own warn/error output into the timeline. The SDK logs
     * renegotiation and ICE problems here, which is exactly what we need when a call
     * loses media without disconnecting.
     */
    captureSdkLogs(): void {
        if (this.isSdkLoggerHooked) return
        try {
            const logger = Video.Logger.getLogger('twilio-video')
            const originalFactory = logger.methodFactory
            logger.methodFactory = (methodName, level, loggerName) => {
                const method = originalFactory(methodName, level, loggerName)
                return (...args: unknown[]) => {
                    if (methodName === 'warn' || methodName === 'error') {
                        const message = args
                            .map(arg =>
                                typeof arg === 'string'
                                    ? arg
                                    : safeStringify(arg)
                            )
                            .join(' ')
                            .slice(0, SDK_MESSAGE_MAX_LENGTH)
                        this.record(
                            {
                                at: new Date(),
                                category: 'sdk',
                                name: methodName,
                                data: { message },
                            },
                            false
                        )
                    }
                    method(...args)
                }
            }
            // loglevel only applies a new methodFactory after setLevel is called.
            logger.setLevel(logger.getLevel())
            this.isSdkLoggerHooked = true
        } catch (error) {
            console.warn(
                `${LOG_PREFIX} unable to hook twilio-video logger`,
                error
            )
        }
    }

    /**
     * Human-readable summary suitable for appending to the video visit log.
     */
    getSummary(): string {
        const env = this.getEnvironment()
        const count = (category: DiagnosticCategory, name?: string) =>
            this.events.filter(
                e => e.category === category && (!name || e.name === name)
            ).length

        const lines = [
            `--- Video diagnostics ---`,
            `SDK: twilio-video ${env.sdkVersion} | Browser: ${
                env.browser
            } | Network: ${env.connectionType ?? 'unknown'}`,
            `Reconnects: ${count(
                'room',
                'reconnecting'
            )} | Publish failures: ${count(
                'room',
                'track-publication-failed'
            )} | Screen share starts: ${count(
                'screenshare',
                'published'
            )} (failed: ${count(
                'screenshare',
                'publish-failed'
            )}) | Mic alerts: ${count('mic') -
                count('mic', 'recovered') -
                count(
                    'mic',
                    'restart-requested'
                )} | Remote audio alerts: ${count(
                'audio-out',
                'remote-audio-stalled'
            )} | SDK warnings: ${count('sdk')}`,
        ]

        const notable = this.events.filter(e =>
            SUMMARY_CATEGORIES.includes(e.category)
        )
        if (notable.length) {
            lines.push(`Timeline (last ${SUMMARY_MAX_LINES}):`)
            notable.slice(-SUMMARY_MAX_LINES).forEach(e => {
                lines.push(
                    `${formatTime(e.at)} ${e.category}:${e.name}${formatData(
                        e.data
                    )}`
                )
            })
        }
        return lines.join('\n')
    }

    private record(event: DiagnosticEvent, echoToConsole: boolean) {
        this.events.push(event)
        if (this.events.length > MAX_EVENTS) {
            this.events.splice(0, this.events.length - MAX_EVENTS)
        }
        if (echoToConsole) {
            const logFn =
                event.category === 'error' ? console.error : console.info
            logFn(
                `${LOG_PREFIX} ${event.category}:${event.name}`,
                event.data ?? ''
            )
        }
        this.listeners.forEach(listener => listener(event))
        return event
    }
}

function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value) ?? String(value)
    } catch {
        return String(value)
    }
}

export const diagnosticsService = new DiagnosticsService()

// Expose for support staff: `avsDiagnostics.getSummary()` in the browser console.
// @ts-ignore
window.avsDiagnostics = diagnosticsService
