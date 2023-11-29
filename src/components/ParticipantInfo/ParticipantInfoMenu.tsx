import {
    Menu as MenuContainer,
    MenuItem,
    Theme,
    Typography,
    useMediaQuery,
} from '@material-ui/core'
import { ReactNode, useCallback, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { videoService } from '../../services/http/video.service'

interface Props {
    isLocalParticipant: boolean | undefined
    participantId: string
    children: ReactNode
}

const Styles = styled.div`
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    margin: 0;
    position: relative;
    z-index: 9000;

    .material-icons {
        color: white;
    }

    &:hover {
        cursor: pointer;
    }
`

export const ParticipantInfoMenu = ({
    isLocalParticipant,
    participantId,
    children,
}: Props) => {
    const isMobile = useMediaQuery((theme: Theme) =>
        theme.breakpoints.down('sm')
    )

    const { URLRoomName: roomName } = useParams<{ URLRoomName?: string }>()
    const { currentUser } = useVideoContext()
    const [menuOpen, setMenuOpen] = useState(true)
    const anchorRef = useRef<any>(null)

    const onRemove = useCallback(() => {
        if (!roomName) {
            return
        }
        videoService.removeParticipant(roomName, participantId)
    }, [roomName, participantId])

    if (!currentUser || isLocalParticipant || !roomName) {
        return <>{children}</>
    }

    return (
        <>
            <Styles
                ref={anchorRef}
                onClick={() => setMenuOpen(isOpen => !isOpen)}
            >
                <div>{children}</div>
                <i className="material-icons">keyboard_arrow_down</i>
            </Styles>
            <MenuContainer
                className="p-0"
                open={menuOpen}
                onClose={() => setMenuOpen(isOpen => !isOpen)}
                anchorEl={anchorRef.current}
                transformOrigin={{
                    vertical: isMobile ? 35 : -40,
                    horizontal: 'left',
                }}
            >
                {!isLocalParticipant && (
                    <MenuItem className="py-0 px-3" onClick={onRemove}>
                        <Typography variant="body1">Remove</Typography>
                    </MenuItem>
                )}
            </MenuContainer>
        </>
    )
}
