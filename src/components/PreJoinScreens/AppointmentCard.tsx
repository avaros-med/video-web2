import { Typography } from '@material-ui/core'
import styled from 'styled-components'
import { Chip } from '../UI/Chip'

interface Props {
    classes?: string
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

export const AppointmentCard = ({ classes }: Props) => {
    return (
        <Styles className={classes ?? ''}>
            <i className="material-icons">event</i>
            <div className="ml-4">
                <Typography
                    className="font-weight-600 mb-1"
                    variant="subtitle1"
                >
                    Monday, January 1, 2000
                </Typography>
                <div className="d-flex align-items-center mb-1">
                    <Typography className="font-weight-500" variant="body1">
                        9:15 AM - 9:30 AM
                    </Typography>
                    <Chip classes="ml-3">
                        <div className="d-flex align-items-center">
                            <i className="material-icons mr-1">timelapse</i>
                            <span>15:44:23</span>
                        </div>
                    </Chip>
                </div>
                <div className="d-flex align-items-center">
                    <i className="material-icons">label</i>
                    <Typography
                        className="ml-2 font-weight-500"
                        variant="body1"
                    >
                        Well Baby Check
                    </Typography>
                </div>
            </div>
        </Styles>
    )
}
