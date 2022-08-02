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

const getRandomNumber = (min: number, max: number) => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min) + min)
}

export const utilsService = {
    getTimeRemaining,
    getRandomNumber,
}
