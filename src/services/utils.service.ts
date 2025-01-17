import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
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

const downloadByUrl = (url: string, filename: string) => {
    if (!filename.endsWith('.pdf')) {
        filename += '.pdf'
    }

    const anchorEl = document.createElement('a')
    anchorEl.href = url
    anchorEl.target = '_blank'
    anchorEl.download = filename || 'download'
    document.body.appendChild(anchorEl)
    anchorEl.click()

    const clickHandler = () => {
        setTimeout(() => {
            window.URL.revokeObjectURL(url)
            document.body.removeChild(anchorEl)
        }, 100)
    }

    anchorEl.addEventListener('click', clickHandler, false)
}

const downloadDocument = (url: string, fileName: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const config: AxiosRequestConfig = {
            responseType: 'blob',
        }
        axios.get(url, config).then(
            (response: AxiosResponse) => {
                const file = new File([response.data], fileName)
                if (file) {
                    resolve(file)
                } else {
                    reject()
                }
            },
            (error: AxiosError) => {
                reject(error)
            }
        )
    })
}

const getFileContent = (file: File): Promise<any> => {
    if (!file) {
        return Promise.reject('Missing file')
    }

    return new Promise((resolve, reject) => {
        var reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = function() {
            const content = reader.result || ''
            resolve(content)
        }
        reader.onerror = function(error) {
            reject(error)
        }
    })
}

const getIp = async (): Promise<string> => {
    try {
        const response = await fetch('https://ifconfig.me/ip').then(res =>
            res.text()
        )
        if (response) {
            return Promise.resolve(response)
        }
        return Promise.reject('Unable to get IP')
    } catch (error) {
        console.error(error)
        return Promise.reject(error)
    }
}

export const utilsService = {
    getTimeRemaining,
    getRandomNumber,
    downloadByUrl,
    downloadDocument,
    getFileContent,
    getIp,
}
