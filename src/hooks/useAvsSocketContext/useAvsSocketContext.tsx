import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react'
import { useParams } from 'react-router-dom'
import {
    MessagesHookState,
    useMessages,
} from '../../components/EChartPanel/useMessages'
import { RoomEvent } from '../../services/events/roomEvents.service'
import { videoService } from '../../services/http/video.service'
import {
    ChatItem,
    FileOffer,
    Message,
} from '../../services/models/Message.model'
import useVideoContext from '../useVideoContext/useVideoContext'

/**
 * The room's chat, fed by the room's event stream on ehr (roomEvents.service.ts): the
 * lines and file offers in order, whether the chat is off, and whether the stream is
 * unavailable. Room opens the stream and hands it `roomEventHandler`.
 */
interface ContextState {
    messages: MessagesHookState
    networkError: {
        hasNetworkError: boolean
        onNetworkError: () => void
    }
    isChatDisabled: boolean
    disableChat: () => Promise<void>
    roomEventHandler: (event: RoomEvent) => void
}

const initialState: ContextState = {
    messages: {} as any,
    networkError: {} as any,
    roomEventHandler: () => {},
    isChatDisabled: process.env.REACT_APP_CHAT_DISABLED_BY_DEFAULT === 'true',
    disableChat: () => Promise.resolve(),
}

const LocalStateContext = createContext<ContextState>(initialState)

// Provider
export function AvsSocketContextProvider({ children }: any) {
    const { URLRoomName } = useParams<{ URLRoomName?: string }>()
    const { room } = useVideoContext()
    const {
        messages,
        hasNewMessages,
        addMessage,
        setHasNewMessages,
        reset: resetMessages,
    } = useMessages()
    const [isChatDisabled, setIsChatDisabled] = useState<boolean>(
        initialState.isChatDisabled
    )
    const [hasNetworkError, setHasNetworkError] = useState<boolean>(false)

    const localIdentity = useMemo(
        () => room?.localParticipant?.identity ?? '',
        [room]
    )

    const add = useCallback(
        (item: ChatItem) => {
            addMessage(item)
            // A line or a file from someone else is news; this page's own is not.
            if (item.senderName !== localIdentity) {
                setHasNewMessages(true)
            }
        },
        [localIdentity, addMessage, setHasNewMessages]
    )

    const roomEventHandler = useCallback(
        (event: RoomEvent) => {
            switch (event.type) {
                case 'Message':
                    add(Message.deserialize(event.payload))
                    break
                case 'FileOffered':
                    add(FileOffer.deserialize(event.payload, false))
                    break
                case 'DocumentOffered':
                    add(FileOffer.deserialize(event.payload, true))
                    break
                case 'ChatTurnedOff':
                    setIsChatDisabled(true)
                    break
            }
        },
        [add]
    )

    const disableChat = useCallback(async () => {
        if (!URLRoomName) return
        await videoService.turnChatOff(URLRoomName)
    }, [URLRoomName])

    const onNetworkError = useCallback(() => setHasNetworkError(true), [])

    return (
        <LocalStateContext.Provider
            value={{
                messages: {
                    messages,
                    hasNewMessages,
                    addMessage,
                    setHasNewMessages,
                    reset: resetMessages,
                },
                networkError: { hasNetworkError, onNetworkError },
                roomEventHandler,
                isChatDisabled,
                disableChat,
            }}
        >
            {children}
        </LocalStateContext.Provider>
    )
}

// Consumer
export function useAvsSocketContext() {
    return useContext(LocalStateContext)
}
