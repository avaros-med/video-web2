import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { makeStyles, Theme } from '@material-ui/core'
import clsx from 'clsx'

/*
 * A prominent, in-call alert that sits just above the toolbar and points at the
 * control it is about to (for example the microphone button). One is shown at a
 * time; see MediaHealthNotifications for the priority rules.
 *
 * Toolbar buttons opt in as anchors with `data-media-anchor="<name>"`. The
 * callout measures the anchor and centres itself over it, clamped to the
 * viewport, with the caret staying on the anchor. Without an anchor it centres
 * on the screen and hides the caret.
 */

export type MediaAlertTone = 'error' | 'warning' | 'info'
export type MediaAlertAnchor = 'mic' | 'camera' | 'screenshare' | 'settings'

export const MEDIA_ANCHOR_ATTRIBUTE = 'data-media-anchor'

export const TONE_COLORS: Record<MediaAlertTone, string> = {
    error: '#c81e1e',
    warning: '#d8641a',
    info: '#0b7fc4',
}

interface MediaAlertCalloutProps {
    open: boolean
    tone: MediaAlertTone
    title: string
    message?: string
    action?: {
        label: string
        onClick: () => void
        isBusy?: boolean
        busyLabel?: string
    }
    onClose?: () => void
    anchor?: MediaAlertAnchor
    /** Auto-dismiss after this many ms. Omit to keep the callout until dismissed. */
    autoHideMs?: number
    'data-testid'?: string
}

const VIEWPORT_GUTTER = 12
const CARET_SIZE = 14

const useStyles = makeStyles((theme: Theme) => ({
    callout: {
        position: 'fixed',
        bottom: `${theme.footerHeight + 22}px`,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        maxWidth: `calc(100vw - ${VIEWPORT_GUTTER * 2}px)`,
        padding: '13px 14px 13px 18px',
        borderRadius: '6px',
        color: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        fontFamily: theme.typography.fontFamily,
        [theme.breakpoints.down('xs')]: {
            flexWrap: 'wrap',
            gap: '10px',
            padding: '12px 14px',
        },
    },
    text: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        minWidth: 0,
    },
    title: {
        fontSize: '18px',
        fontWeight: 700,
        lineHeight: 1.2,
    },
    message: {
        fontSize: '14px',
        lineHeight: 1.35,
        opacity: 0.88,
    },
    action: {
        flexShrink: 0,
        background: '#fff',
        border: 0,
        borderRadius: '4px',
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: 700,
        padding: '10px 16px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        '&:hover': {
            background: 'rgba(255,255,255,0.9)',
        },
        '&:disabled': {
            cursor: 'default',
            opacity: 0.8,
        },
    },
    close: {
        flexShrink: 0,
        background: 'transparent',
        border: 0,
        color: '#fff',
        opacity: 0.85,
        cursor: 'pointer',
        padding: '4px',
        marginLeft: '-6px',
        display: 'flex',
        alignItems: 'center',
        '&:hover': {
            opacity: 1,
        },
        '& .material-icons': {
            fontSize: '20px',
        },
    },
    caret: {
        position: 'absolute',
        bottom: `-${CARET_SIZE / 2}px`,
        width: `${CARET_SIZE}px`,
        height: `${CARET_SIZE}px`,
        transform: 'translateX(-50%) rotate(45deg)',
    },
}))

interface Placement {
    left: number
    caretOffset: number | null
}

function measureAnchor(anchor?: MediaAlertAnchor): number | null {
    if (!anchor || typeof document === 'undefined') return null
    const element = document.querySelector(
        `[${MEDIA_ANCHOR_ATTRIBUTE}="${anchor}"]`
    )
    if (!element) return null
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return null
    return rect.left + rect.width / 2
}

function usePlacement(
    open: boolean,
    anchor: MediaAlertAnchor | undefined,
    ref: React.RefObject<HTMLDivElement>
): Placement {
    const [placement, setPlacement] = useState<Placement>({
        left: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
        caretOffset: null,
    })

    useLayoutEffect(() => {
        if (!open) return

        const update = () => {
            const viewportWidth = window.innerWidth
            const anchorX = measureAnchor(anchor)
            const halfWidth = (ref.current?.offsetWidth ?? 0) / 2
            const target = anchorX ?? viewportWidth / 2
            const left = Math.min(
                Math.max(target, halfWidth + VIEWPORT_GUTTER),
                Math.max(viewportWidth - halfWidth - VIEWPORT_GUTTER, halfWidth)
            )
            setPlacement({
                left,
                caretOffset: anchorX === null ? null : anchorX - left,
            })
        }

        update()
        window.addEventListener('resize', update)
        let observer: ResizeObserver | undefined
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(update)
            observer.observe(document.body)
        }
        return () => {
            window.removeEventListener('resize', update)
            observer?.disconnect()
        }
    }, [open, anchor, ref])

    return placement
}

export default function MediaAlertCallout({
    open,
    tone,
    title,
    message,
    action,
    onClose,
    anchor,
    autoHideMs,
    'data-testid': testId,
}: MediaAlertCalloutProps) {
    const classes = useStyles()
    const ref = useRef<HTMLDivElement>(null)
    const placement = usePlacement(open, anchor, ref)

    useEffect(() => {
        if (!open || !autoHideMs || !onClose) return
        const timer = window.setTimeout(onClose, autoHideMs)
        return () => window.clearTimeout(timer)
    }, [open, autoHideMs, onClose])

    if (!open) return null

    const color = TONE_COLORS[tone]

    return (
        <div
            ref={ref}
            role={tone === 'error' ? 'alert' : 'status'}
            className={clsx(classes.callout, `media-alert-${tone}`)}
            style={{
                left: placement.left,
                transform: 'translateX(-50%)',
                background: color,
            }}
            data-testid={testId}
        >
            <div className={classes.text}>
                <div className={classes.title}>{title}</div>
                {message && <div className={classes.message}>{message}</div>}
            </div>
            {action && (
                <button
                    type="button"
                    className={classes.action}
                    style={{ color }}
                    onClick={action.onClick}
                    disabled={action.isBusy}
                >
                    {action.isBusy
                        ? action.busyLabel ?? action.label
                        : action.label}
                </button>
            )}
            {onClose && (
                <button
                    type="button"
                    className={classes.close}
                    onClick={onClose}
                    aria-label="Dismiss"
                >
                    <i className="material-icons">close</i>
                </button>
            )}
            {placement.caretOffset !== null && (
                <div
                    className={classes.caret}
                    style={{
                        left: `calc(50% + ${placement.caretOffset}px)`,
                        background: color,
                    }}
                />
            )}
        </div>
    )
}
