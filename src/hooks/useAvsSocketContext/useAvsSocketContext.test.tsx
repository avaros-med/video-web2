import React from 'react'
import { act, renderHook } from '@testing-library/react-hooks'
import {
    AvsSocketContextProvider,
    useAvsSocketContext,
} from './useAvsSocketContext'
import { videoService } from '../../services/http/video.service'
import { FileOffer, Message } from '../../services/models/Message.model'

jest.mock('react-router-dom', () => ({
    useParams: () => ({ URLRoomName: 'braamc_999998-abc' }),
}))
jest.mock('../useVideoContext/useVideoContext', () => () => ({
    room: { localParticipant: { identity: 'Jane_123456' } },
}))
jest.mock('../../services/http/video.service', () => ({
    videoService: { turnChatOff: jest.fn(() => Promise.resolve()) },
}))

const wrapper: React.FC = ({ children }) => (
    <AvsSocketContextProvider>{children}</AvsSocketContextProvider>
)

const line = (id: string, senderName: string) => ({
    eventID: id,
    type: 'Message' as const,
    payload: {
        id,
        message: `line ${id}`,
        senderName,
        fromProvider: false,
        sentAt: '2026-10-13T13:05:00Z',
    },
})

describe("the room's chat", () => {
    it('keeps each line once, in order, and flags only what others sent', () => {
        const { result } = renderHook(useAvsSocketContext, { wrapper })

        act(() => result.current.roomEventHandler(line('a', 'Jane_123456')))
        expect(result.current.messages.hasNewMessages).toBe(false)

        act(() =>
            result.current.roomEventHandler(line('b', 'Doctor Oscardoc_654321'))
        )
        act(() =>
            result.current.roomEventHandler(line('b', 'Doctor Oscardoc_654321'))
        )

        const items = result.current.messages.messages
        expect(items.map(item => item.id)).toEqual(['a', 'b'])
        expect(items[1]).toBeInstanceOf(Message)
        expect((items[1] as Message).message).toBe('line b')
        expect(result.current.messages.hasNewMessages).toBe(true)
    })

    it('shows file offers, and knows a chart document from a file', () => {
        const { result } = renderHook(useAvsSocketContext, { wrapper })
        const offer = {
            id: 'f',
            name: 'rash.png',
            size: 3,
            contentType: 'image/png',
            expiresAt: '2026-10-13T13:15:00Z',
            senderName: 'Jane_123456',
            fromProvider: false,
        }

        act(() =>
            result.current.roomEventHandler({
                eventID: '1',
                type: 'FileOffered',
                payload: offer,
            })
        )
        act(() =>
            result.current.roomEventHandler({
                eventID: '2',
                type: 'DocumentOffered',
                payload: {
                    ...offer,
                    id: 'd',
                    name: 'ECG.pdf',
                    fromProvider: true,
                },
            })
        )

        const [file, document] = result.current.messages.messages as FileOffer[]
        expect([file.isDocument, document.isDocument]).toEqual([false, true])
        expect(document.name).toBe('ECG.pdf')
    })

    it('turns the chat off when the provider does, and asks ehr to when this is the provider', async () => {
        const { result } = renderHook(useAvsSocketContext, { wrapper })

        await act(() => result.current.disableChat())
        expect(videoService.turnChatOff).toHaveBeenCalledWith(
            'braamc_999998-abc'
        )

        act(() =>
            result.current.roomEventHandler({
                eventID: '3',
                type: 'ChatTurnedOff',
                payload: {},
            })
        )
        expect(result.current.isChatDisabled).toBe(true)
    })
})
