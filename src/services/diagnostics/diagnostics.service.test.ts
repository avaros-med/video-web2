import { DiagnosticsService } from './diagnostics.service'

describe('the DiagnosticsService', () => {
    let service: DiagnosticsService

    beforeEach(() => {
        service = new DiagnosticsService()
        jest.spyOn(console, 'info').mockImplementation(() => undefined)
        jest.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('should record events and notify subscribers', () => {
        const listener = jest.fn()
        service.subscribe(listener)
        const event = service.log('mic', 'system-muted', { label: 'Mic' })
        expect(service.getEvents()).toEqual([event])
        expect(listener).toHaveBeenCalledWith(event)
        expect(
            console.info
        ).toHaveBeenCalledWith('[avs-video] mic:system-muted', { label: 'Mic' })
    })

    it('should cap the timeline length', () => {
        for (let i = 0; i < 450; i++) {
            service.log('network', `event-${i}`)
        }
        const events = service.getEvents()
        expect(events).toHaveLength(400)
        expect(events[0].name).toBe('event-50')
    })

    it('should summarise counts and notable events for the visit log', () => {
        service.log('room', 'connected', { roomSid: 'RM123' })
        service.log('screenshare', 'published', { surface: 'monitor' })
        service.log('room', 'reconnecting', { code: 53405 })
        service.log('screenshare', 'publish-failed', { code: 53405 })
        service.log('mic', 'not-sending', { bytesSent: 100 })
        service.log('network', 'local-quality-low', { level: 1 })

        const summary = service.getSummary()
        expect(summary).toContain('--- Video diagnostics ---')
        expect(summary).toContain('SDK: twilio-video 0.0.0-mock')
        expect(summary).toContain('Reconnects: 1')
        expect(summary).toContain('Screen share starts: 1 (failed: 1)')
        expect(summary).toContain('Mic alerts: 1')
        expect(summary).toMatch(
            /\d{2}:\d{2}:\d{2} room:connected \(roomSid=RM123\)/
        )
        expect(summary).toContain('screenshare:publish-failed (code=53405)')
        // Network noise is counted but not listed line by line.
        expect(summary).not.toContain('network:local-quality-low')
    })

    it('should count only genuine microphone problems, not restart bookkeeping', () => {
        service.log('mic', 'not-sending', { bytesSent: 0 })
        service.log('mic', 'restart-requested', { from: 'not-sending' })
        service.log('mic', 'restart-fallback', { message: 'device gone' })
        service.log('mic', 'restart-failed', { message: 'device gone' })
        service.log('mic', 'restarted', { label: 'Built-in Microphone' })
        service.log('mic', 'recovered', { from: 'not-sending' })

        // One problem occurred; the rest is the app reporting on its own recovery.
        expect(service.getSummary()).toContain('Mic alerts: 1')
    })
})
