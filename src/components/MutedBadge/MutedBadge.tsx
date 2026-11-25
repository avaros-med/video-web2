import React from 'react'
import { TONE_COLORS } from '../MediaAlertCallout/MediaAlertCallout'

export const MUTED_LABEL = 'Muted'

/*
 * The "this person has muted their microphone" marker on a participant tile: a solid
 * red pill with a mic-off icon and the word, in place of the small slashed glyph that
 * was easy to miss beside the name.
 */
export default function MutedBadge({ compact }: { compact?: boolean }) {
    return (
        <span
            data-cy-muted-badge
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: TONE_COLORS.error,
                color: 'white',
                fontWeight: 600,
                fontSize: compact ? '13px' : '15px',
                lineHeight: 1.4,
                padding: compact ? '0.18em 0.6em' : '0.2em 0.7em 0.2em 0.5em',
                whiteSpace: 'nowrap',
            }}
        >
            <i
                className="material-icons"
                style={{ fontSize: compact ? '16px' : '20px' }}
            >
                mic_off
            </i>
            {MUTED_LABEL}
        </span>
    )
}
