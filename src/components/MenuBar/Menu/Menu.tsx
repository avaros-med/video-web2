import {
    Menu as MenuContainer,
    MenuItem,
    styled,
    Theme,
    Typography,
    useMediaQuery,
} from '@material-ui/core'
import { isSupported } from '@twilio/video-processors'
import { useRef, useState } from 'react'
import AboutDialog from '../../AboutDialog/AboutDialog'
import DeviceSelectionDialog from '../../DeviceSelectionDialog/DeviceSelectionDialog'

import useChatContext from '../../../hooks/useChatContext/useChatContext'
import useFlipCameraToggle from '../../../hooks/useFlipCameraToggle/useFlipCameraToggle'
import { useAppState } from '../../../state'
import { usePanelContext } from '../../Panel/usePanelContext'
import { IconButton } from '../../UI/IconButton'

export const IconContainer = styled('div')({
    display: 'flex',
    justifyContent: 'center',
    width: '1.5em',
    marginRight: '0.7em',
})

const FontWeightBold = styled('span')({
    fontWeight: 500,
})

export default function Menu(props: { buttonClassName?: string }) {
    const isMobile = useMediaQuery((theme: Theme) =>
        theme.breakpoints.down('sm')
    )

    const [aboutOpen, setAboutOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)

    const { setIsGalleryViewActive, isGalleryViewActive } = useAppState()
    const { setIsChatWindowOpen } = useChatContext()
    const {
        showJoiningInfo,
        showBackgroundSelection,
        showMediaDevices,
    } = usePanelContext().panel

    const anchorRef = useRef<any>(null)
    const {
        flipCameraDisabled,
        toggleFacingMode,
        flipCameraSupported,
    } = useFlipCameraToggle()

    return (
        <>
            <div ref={anchorRef}>
                <IconButton
                    classes={props.buttonClassName}
                    intent="text"
                    icon="settings"
                    onClick={() => setMenuOpen(isOpen => !isOpen)}
                    tooltipContent="Settings"
                    data-cy-more-button
                />
            </div>
            <MenuContainer
                open={menuOpen}
                onClose={() => setMenuOpen(isOpen => !isOpen)}
                anchorEl={anchorRef.current}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: isMobile ? -55 : 'bottom',
                    horizontal: 'center',
                }}
            >
                <MenuItem onClick={showJoiningInfo}>
                    <IconContainer>
                        <i className="material-icons">info</i>
                    </IconContainer>
                    <Typography variant="body1">Room Info</Typography>
                </MenuItem>

                <MenuItem onClick={showMediaDevices}>
                    <IconContainer>
                        <i className="material-icons">settings</i>
                    </IconContainer>
                    <Typography variant="body1">Media Devices</Typography>
                </MenuItem>

                {isSupported && (
                    <MenuItem
                        onClick={() => {
                            showBackgroundSelection()
                            setIsChatWindowOpen(false)
                            setMenuOpen(false)
                        }}
                    >
                        <IconContainer>
                            <i className="material-icons">wallpaper</i>
                        </IconContainer>
                        <Typography variant="body1">
                            <FontWeightBold>Backgrounds</FontWeightBold>
                        </Typography>
                    </MenuItem>
                )}

                {flipCameraSupported && (
                    <MenuItem
                        disabled={flipCameraDisabled}
                        onClick={toggleFacingMode}
                    >
                        <IconContainer>
                            <i className="material-icons">cameraswitch</i>
                        </IconContainer>
                        <Typography variant="body1">
                            <FontWeightBold>Flip Camera</FontWeightBold>
                        </Typography>
                    </MenuItem>
                )}

                {/* Recording */}
                {/* {roomType !== 'peer-to-peer' && roomType !== 'go' && (
                    <MenuItem
                        disabled={isFetching}
                        onClick={() => {
                            setMenuOpen(false)
                            if (isRecording) {
                                updateRecordingRules(room!.sid, [
                                    { type: 'exclude', all: true },
                                ])
                            } else {
                                updateRecordingRules(room!.sid, [
                                    { type: 'include', all: true },
                                ])
                            }
                        }}
                        data-cy-recording-button
                    >
                        <IconContainer>
                            {isRecording ? (
                                <StopRecordingIcon />
                            ) : (
                                <StartRecordingIcon />
                            )}
                        </IconContainer>
                        <Typography variant="body1">
                        <FontWeightBold>
                            {isRecording ? 'Stop' : 'Start'} Recording
                            </FontWeightBold>
                        </Typography>
                    </MenuItem>
                )} */}

                {/* Monitoring */}
                {/* <MenuItem
                    onClick={() => {
                        VideoRoomMonitor.toggleMonitor()
                        setMenuOpen(false)
                    }}
                >
                    <IconContainer>
                        <SearchIcon
                            style={{ fill: '#707578', width: '0.9em' }}
                        />
                    </IconContainer>
                    <Typography variant="body1">
                    <FontWeightBold>
                            Room Monitor
                            </FontWeightBold>
                            </Typography>
                </MenuItem> */}

                <MenuItem
                    onClick={() => {
                        setIsGalleryViewActive(isGallery => !isGallery)
                        setMenuOpen(false)
                    }}
                >
                    <IconContainer>
                        {isGalleryViewActive ? (
                            <i className="material-icons">account_box</i>
                        ) : (
                            <i className="material-icons">grid_view</i>
                        )}
                    </IconContainer>
                    <Typography variant="body1">
                        <FontWeightBold>
                            {isGalleryViewActive
                                ? 'Speaker View'
                                : 'Gallery View'}
                        </FontWeightBold>
                    </Typography>
                </MenuItem>

                {/* About */}
                {/* <MenuItem onClick={() => setAboutOpen(true)}>
                    <IconContainer>
                        <InfoIconOutlined />
                    </IconContainer>
                    <Typography variant="body1">
                    <FontWeightBold>
                    About
                    </FontWeightBold>
                    </Typography>
                </MenuItem> */}
            </MenuContainer>
            <AboutDialog
                open={aboutOpen}
                onClose={() => {
                    setAboutOpen(false)
                    setMenuOpen(false)
                }}
            />
            <DeviceSelectionDialog
                open={settingsOpen}
                onClose={() => {
                    setSettingsOpen(false)
                    setMenuOpen(false)
                }}
            />
        </>
    )
}
