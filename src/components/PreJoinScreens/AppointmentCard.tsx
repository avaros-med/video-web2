import { Typography } from '@material-ui/core'
import moment from 'moment'
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { VideoRoom } from '../../services/models/VideoRoom.model'
import { utilsService } from '../../services/utils.service'
import { Chip } from '../UI/Chip'

interface Props {
    classes?: string
    videoRoom: VideoRoom
}

const Styles = styled.div`
    padding: 12px 0;
    display: flex;

    .font-weight-600 {
        font-weight: 600;
    }

    .font-weight-500 {
        font-weight: 500;
    }
`

const MOMENT_LONGDATE_FORMAT = 'dddd, MMMM Do, YYYY' // Monday, January 1st, 2000
const MOMENT_TIME_FORMAT = 'hh:mm A' // 05:30 PM

export const AppointmentCard = ({ classes, videoRoom }: Props) => {
    const [timeRemaining, setTimeRemaining] = useState<string | null>(null)

    // Calculate time remaining every second
    useEffect(() => {
        const interval = setInterval(() => {
            const _timeRemaining = utilsService.getTimeRemaining(
                videoRoom.startAt
            )
            setTimeRemaining(_timeRemaining)

            if (!_timeRemaining) {
                clearInterval(interval)
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [videoRoom.startAt])

    const hasAppointmentType =
        !!videoRoom.typeName && videoRoom.typeName !== 'Default'

    return (
        <Styles className={classes ?? ''}>
            <i className="material-icons">event</i>
            <div className="ml-4">
                <Typography
                    className="font-weight-600 mb-1"
                    variant="subtitle1"
                >
                    {moment(videoRoom.startAt).format(MOMENT_LONGDATE_FORMAT)}
                </Typography>
                <div className="d-flex align-items-center mb-1">
                    <Typography className="font-weight-500" variant="body1">
                        {moment(videoRoom.startAt).format(MOMENT_TIME_FORMAT)}
                        <span>&nbsp;-&nbsp;</span>
                        {moment(videoRoom.endAt).format(MOMENT_TIME_FORMAT)}
                    </Typography>
                    {timeRemaining && (
                        <Chip classes="ml-3">
                            <div className="d-flex align-items-center">
                                <i className="material-icons mr-1">timelapse</i>
                                <span>{timeRemaining}</span>
                            </div>
                        </Chip>
                    )}
                </div>
                {hasAppointmentType && (
                    <div className="d-flex align-items-center">
                        <i
                            className="material-icons"
                            style={{
                                color: videoRoom.typeColor ?? undefined,
                            }}
                        >
                            label
                        </i>
                        <Typography
                            className="ml-2 font-weight-500"
                            variant="body1"
                        >
                            {videoRoom.typeName}
                        </Typography>
                    </div>
                )}
            </div>
        </Styles>
    )
}
