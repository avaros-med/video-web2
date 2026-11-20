import styled from 'styled-components'
import Colors from '../../colors'
import { VideoRoom } from '../../services/models/VideoRoom.model'
import { Avatar } from '../UI/Avatar'

interface Props {
    classes?: string
    videoRoom: VideoRoom
}

const Styles = styled.div`
    padding: 12px 16px;
    background: ${Colors.BLUE}1C;
    border-radius: 5px;
    font-weight: 500;

    .name {
        font-size: 15px;
        font-weight: 600;
        color: ${Colors.BLUE};
    }

    .font-weight-600 {
        font-weight: 600;
    }
`

export const ProviderCard = ({ classes, videoRoom }: Props) => {
    const providerName = VideoRoom.getProviderName(videoRoom)

    return (
        <Styles className={classes ?? ''}>
            <div className="d-flex align-items-center mb-1">
                <Avatar classes="mr-2" name={providerName} />
                <span className="name">{providerName}</span>
            </div>
        </Styles>
    )
}
