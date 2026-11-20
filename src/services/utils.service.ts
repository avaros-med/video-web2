import moment from 'moment'

// Return time remaining until given date in 01:25:55 format
const getTimeRemaining = (date: Date): string | null => {
    const dateDiff = moment(date).diff(moment())
    if (dateDiff <= 0) {
        return null
    }

    const duration = moment.duration(dateDiff)
    let hours: number | string = duration.hours()
    if (hours < 10) {
        hours = '0' + hours
    }
    let minutes: number | string = duration.minutes()
    if (minutes < 10) {
        minutes = '0' + minutes
    }
    let seconds: number | string = duration.seconds()
    if (seconds < 10) {
        seconds = '0' + seconds
    }

    return [hours, minutes, seconds].join(':')
}

/** Saves a file the page received (a download from ehr) under its own name. */
const saveBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const anchorEl = document.createElement('a')
    anchorEl.href = url
    anchorEl.download = filename || 'download'
    document.body.appendChild(anchorEl)
    anchorEl.click()
    setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(anchorEl)
    }, 100)
}

/**
 * When this person's call started (useRoom sets it on connecting; the relay fallback's
 * rejoin keeps it): the visit log's start. null before a call.
 */
const sessionStartedAt = (): Date | null =>
    ((window as unknown) as { sessionStartedAt?: Date }).sessionStartedAt ??
    null

export const utilsService = {
    getTimeRemaining,
    saveBlob,
    sessionStartedAt,
}
