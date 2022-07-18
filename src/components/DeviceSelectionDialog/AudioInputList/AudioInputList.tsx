import {
    FormControl,
    Grid,
    MenuItem,
    Select,
    Typography,
} from '@material-ui/core'
import { LocalAudioTrack } from 'twilio-video'
import { SELECTED_AUDIO_INPUT_KEY } from '../../../constants'
import useDevices from '../../../hooks/useDevices/useDevices'
import useMediaStreamTrack from '../../../hooks/useMediaStreamTrack/useMediaStreamTrack'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import AudioLevelIndicator from '../../AudioLevelIndicator/AudioLevelIndicator'
import { TextHintStyles } from '../../UI/styles/styles'

export default function AudioInputList() {
    const { audioInputDevices } = useDevices()
    const { localTracks } = useVideoContext()

    const localAudioTrack = localTracks.find(
        track => track.kind === 'audio'
    ) as LocalAudioTrack
    const mediaStreamTrack = useMediaStreamTrack(localAudioTrack)
    const localAudioInputDeviceId = mediaStreamTrack?.getSettings().deviceId

    function replaceTrack(newDeviceId: string) {
        window.localStorage.setItem(SELECTED_AUDIO_INPUT_KEY, newDeviceId)
        localAudioTrack?.restart({ deviceId: { exact: newDeviceId } })
    }

    return (
        <div>
            <Typography variant="subtitle2" gutterBottom>
                Audio Input
            </Typography>
            <Grid container alignItems="center" justifyContent="space-between">
                <div className="inputSelect w-75">
                    {audioInputDevices.length > 1 ? (
                        <FormControl fullWidth>
                            <Select
                                onChange={e =>
                                    replaceTrack(e.target.value as string)
                                }
                                value={localAudioInputDeviceId || ''}
                                variant="outlined"
                            >
                                {audioInputDevices.map(device => (
                                    <MenuItem
                                        value={device.deviceId}
                                        key={device.deviceId}
                                    >
                                        {device.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <Typography>
                            {localAudioTrack?.mediaStreamTrack.label || (
                                <TextHintStyles>No Local Audio</TextHintStyles>
                            )}
                        </Typography>
                    )}
                </div>
                <AudioLevelIndicator
                    audioTrack={localAudioTrack}
                    color="black"
                />
            </Grid>
        </div>
    )
}
