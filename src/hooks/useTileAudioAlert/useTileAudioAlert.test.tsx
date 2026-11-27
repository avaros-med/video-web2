import React from 'react'
import { renderHook } from '@testing-library/react-hooks'
import { VideoContext } from '../../components/VideoProvider'
import useTileAudioAlert, {
    LOCAL_MIC_ALERT_LABEL,
    LOCAL_MIC_PAUSED_LABEL,
    REMOTE_AUDIO_ALERT_LABEL,
    REMOTE_MIC_PROBLEM_LABELS,
} from './useTileAudioAlert'

const patient = { identity: 'Patient' } as any

const alertFor = (context: any, isLocal = false) =>
    renderHook(() => useTileAudioAlert(patient, isLocal), {
        wrapper: ({ children }: { children?: React.ReactNode }) => (
            <VideoContext.Provider value={context}>
                {children}
            </VideoContext.Provider>
        ),
    }).result.current

const health = (
    micStatus: string,
    remoteAudioAlert: any = null,
    remoteMicProblems: any = {}
) => ({
    audioHealth: { micStatus, remoteAudioAlert },
    remoteMicProblems,
})

describe('useTileAudioAlert', () => {
    it('shows nothing on a healthy call or outside a VideoProvider', () => {
        expect(alertFor(health('ok'))).toBeNull()
        expect(alertFor(health('ok'), true)).toBeNull()
        expect(alertFor(null)).toBeNull()
    })

    it('tells the local participant when their device paused the microphone', () => {
        expect(alertFor(health('system-muted'), true)).toEqual({
            tone: 'error',
            label: LOCAL_MIC_PAUSED_LABEL,
            icon: 'mic_off',
        })
    })

    it('keeps the general label for other local microphone problems', () => {
        for (const status of ['ended', 'silent', 'not-sending']) {
            expect(alertFor(health(status), true)?.label).toBe(
                LOCAL_MIC_ALERT_LABEL
            )
        }
    })

    it("marks a remote tile only when that participant's audio stopped arriving", () => {
        const stalled = { identity: 'Patient', trackSid: 'MT1' }
        expect(alertFor(health('ok', stalled))?.label).toBe(
            REMOTE_AUDIO_ALERT_LABEL
        )
        expect(
            alertFor(
                health('ok', { identity: 'Someone else', trackSid: 'MT2' })
            )
        ).toBeNull()
        // Our own microphone problem is not shown on someone else's tile.
        expect(alertFor(health('system-muted'))).toBeNull()
    })

    it("shows on a remote tile the problem that participant's browser reports", () => {
        expect(
            alertFor(health('ok', null, { Patient: 'system-muted' }))
        ).toEqual({
            tone: 'error',
            label: REMOTE_MIC_PROBLEM_LABELS['system-muted'],
            icon: 'mic_off',
        })
        // A report about someone else does not mark this tile.
        expect(
            alertFor(health('ok', null, { 'Someone else': 'ended' }))
        ).toBeNull()
    })

    it('prefers the reported problem over the no-audio inference', () => {
        const stalled = { identity: 'Patient', trackSid: 'MT1' }
        expect(
            alertFor(health('ok', stalled, { Patient: 'ended' }))?.label
        ).toBe(REMOTE_MIC_PROBLEM_LABELS.ended)
    })

    it('never shows a remote report on the local tile', () => {
        expect(
            alertFor(health('ok', null, { Patient: 'system-muted' }), true)
        ).toBeNull()
    })
})
