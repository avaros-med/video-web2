import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { useHttpDemographic } from '../../components/EChartPanel/EChartView/useHttpDemographic'
import { useEChartContext } from '../../components/EChartPanel/useEChartContext'
import {
    MessagesHookState,
    useMessages,
} from '../../components/EChartPanel/useMessages'
import { AttachmentAuthenticated } from '../../services/event-bus/events'
import { AttachmentMessage, Message } from '../../services/models/Message.model'
import { utilsService } from '../../services/utils.service'
import {
    AuthenticateAttachment,
    SendAttachment,
} from '../../services/ws/eventout'
import { BaseEvent, socketService } from '../../services/ws/socket.service'
import useVideoContext from '../useVideoContext/useVideoContext'

interface ContextState {
    messages: MessagesHookState
    networkError: {
        hasNetworkError: boolean
        onNetworkError: () => void
    }
    socketEventHandler: (event: BaseEvent) => void
}

const initialState: ContextState = {
    messages: {} as any,
    networkError: {} as any,
    socketEventHandler: {} as any,
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
    const {
        getDocumentUrl,
        authenticateDemographicDocument,
    } = useHttpDemographic()
    const { demographic } = useEChartContext().demographic
    const [hasNetworkError, setHasNetworkError] = useState<boolean>(false)

    const localParticipantName = useMemo(
        () => room?.localParticipant.identity ?? '',
        [room]
    )

    const addMessageHandler = useCallback(
        (message: Message) => {
            addMessage(message)

            // Set new-messages flag if new message is not from the local participant
            if (message.senderName !== room?.localParticipant?.identity) {
                setHasNewMessages(true)
            }
        },
        [room, addMessage, setHasNewMessages]
    )

    const attachmentRequestHandler = useCallback(
        (attachmentMessage: AttachmentMessage) => {
            addMessage(attachmentMessage)

            // Set new-messages flag if new message is not from the local participant
            if (
                attachmentMessage.senderName !==
                room?.localParticipant?.identity
            ) {
                setHasNewMessages(true)
            }
        },
        [room, addMessage, setHasNewMessages]
    )

    const authenticateAttachmentHandler = useCallback(
        (authenticateAttachment: AuthenticateAttachment) => {
            if (!demographic) {
                return
            }

            // Authenticate the attachment
            ;((): Promise<boolean> => {
                return authenticateDemographicDocument(
                    authenticateAttachment.ID,
                    authenticateAttachment.name,
                    authenticateAttachment.type,
                    authenticateAttachment.patientDOB
                )
            })()
                // Get attachment url
                .then(
                    (isAuthenticated: boolean): Promise<string | null> => {
                        if (!isAuthenticated) {
                            return Promise.resolve(null)
                        }

                        return getDocumentUrl(
                            demographic.demographicNo,
                            authenticateAttachment.ID,
                            authenticateAttachment.name,
                            authenticateAttachment.type
                        )
                    }
                )

                // Get attachment file object
                .then(
                    (url: string | null): Promise<File | null> => {
                        if (!url) {
                            return Promise.resolve(null)
                        }

                        return utilsService.downloadDocument(
                            url,
                            authenticateAttachment.name
                        )
                    }
                )

                // Send attachment bytes to participants
                .then((file: File | null) => {
                    if (!file) {
                        return
                    }

                    utilsService
                        .getFileContent(file)
                        .then((filecontent: any) => {
                            const eventout: SendAttachment = {
                                name: authenticateAttachment.name,
                                bytes: filecontent,
                                senderName: localParticipantName,
                                roomName: URLRoomName!,
                            }
                            socketService.dispatchEvent(
                                'SendAttachment',
                                eventout
                            )
                        })
                })
        },
        [
            URLRoomName,
            demographic,
            localParticipantName,
            getDocumentUrl,
            authenticateDemographicDocument,
        ]
    )

    const sendAttachmentHandler = useCallback(
        (sentAttachment: SendAttachment) => {
            fetch(sentAttachment.bytes)
                .then(res => res.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob)
                    utilsService.downloadByUrl(url, sentAttachment.name)

                    // Emit an AttachmentAuthenticated event to notify authentication dialog
                    AttachmentAuthenticated.emit()
                })
                .catch(() => {})
        },
        []
    )

    const socketEventHandler = useCallback(
        (event: BaseEvent) => {
            switch (event.type) {
                case 'Message': {
                    const newMessage = new Message(
                        Message.deserialize(event.payload)
                    )
                    addMessageHandler(newMessage)
                    break
                }

                case 'SendAttachmentRequest': {
                    const newAttachmentMessage = new AttachmentMessage(
                        AttachmentMessage.deserialize(event.payload)
                    )
                    attachmentRequestHandler(newAttachmentMessage)
                    break
                }

                case 'AuthenticateAttachment': {
                    const authenticateAttachment = event.payload as AuthenticateAttachment

                    // Continue if the local participant is the original attachment sender
                    if (
                        localParticipantName ===
                        authenticateAttachment.senderName
                    ) {
                        authenticateAttachmentHandler(authenticateAttachment)
                    }
                    break
                }

                case 'SendAttachment': {
                    const sentAttachment = event.payload as SendAttachment

                    // Open the attachment if the local participant is not the original attachment sender
                    if (localParticipantName !== sentAttachment.senderName) {
                        sendAttachmentHandler(sentAttachment)
                    }
                    break
                }
            }
        },
        [
            localParticipantName,
            addMessageHandler,
            attachmentRequestHandler,
            authenticateAttachmentHandler,
            sendAttachmentHandler,
        ]
    )

    const onNetworkError = useCallback(() => {
        setHasNetworkError(true)
    }, [])

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
                socketEventHandler,
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
