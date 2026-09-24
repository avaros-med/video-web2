import { useEffect } from 'react'
import { VideoRoomMonitor } from '@twilio/video-room-monitor'
import { diagnosticsService } from '../../services/diagnostics/diagnostics.service'

/*
 * Ctrl+Shift+D (Cmd+Shift+D on macOS) toggles Twilio's Room Monitor so a provider
 * or support staff can see live per-track bitrates, packet loss and codec details
 * while a problem is happening, without needing the Settings menu.
 */
export default function useRoomMonitorShortcut() {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isModifier = event.ctrlKey || event.metaKey
            if (
                isModifier &&
                event.shiftKey &&
                event.key.toLowerCase() === 'd'
            ) {
                event.preventDefault()
                toggleRoomMonitor('keyboard')
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])
}

export function toggleRoomMonitor(source: 'keyboard' | 'menu') {
    diagnosticsService.log('room', 'room-monitor-toggled', { source })
    VideoRoomMonitor.toggleMonitor()
}
