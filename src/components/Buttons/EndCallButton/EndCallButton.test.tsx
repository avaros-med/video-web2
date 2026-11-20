import React from 'react'
import { shallow } from 'enzyme'

import EndCallButton from './EndCallButton'
import { IconButton } from '../../UI/IconButton'
import { videoService } from '../../../services/http/video.service'

const mockRoom = {
    disconnect: jest.fn(),
}

const mockVideoContext = {
    room: mockRoom,
    currentUser: null,
    videoRoom: { startAt: new Date('2026-10-13T13:00:00Z') },
}

jest.mock('react-router-dom', () => ({
    useParams: jest.fn(() => ({ URLRoomName: 'braamc_999998-abc' })),
}))

jest.mock('../../../hooks/useVideoContext/useVideoContext', () => () =>
    mockVideoContext
)

jest.mock('../../../hooks/useAvsSocketContext/useAvsSocketContext', () => ({
    useAvsSocketContext: jest.fn(() => ({
        messages: { reset: jest.fn() },
    })),
}))

jest.mock(
    '../../../components/EChartPanel/useEChartContext',
    () => ({
        useEChartContext: jest.fn(() => ({
            demographic: { clearDemographic: jest.fn() },
        })),
    }),
    { virtual: true }
)

jest.mock('../../EChartPanel/useEChartContext', () => ({
    useEChartContext: jest.fn(() => ({
        demographic: { clearDemographic: jest.fn() },
    })),
}))

jest.mock('../../Panel/usePanelContext', () => ({
    usePanelContext: jest.fn(() => ({
        panel: { onClose: jest.fn() },
    })),
}))

jest.mock('../../../services/http/video.service', () => ({
    videoService: {
        logVisit: jest.fn(() => Promise.resolve()),
    },
}))

jest.mock('../../EndCallDialog/EndCallDialog', () => () => null)

jest.mock('../../../services/diagnostics/diagnostics.service', () => ({
    diagnosticsService: { getSummary: () => 'Diagnostics: none' },
}))

describe('End Call button', () => {
    beforeEach(jest.clearAllMocks)

    it("logs the patient's visit on ehr, then disconnects", async () => {
        // @ts-ignore
        window.sessionStartedAt = new Date('2026-10-13T13:02:00Z')
        const wrapper = shallow(<EndCallButton />)
        wrapper.find(IconButton).simulate('click')
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(videoService.logVisit).toHaveBeenCalledWith(
            'braamc_999998-abc',
            // @ts-ignore
            window.sessionStartedAt,
            expect.stringContaining('Diagnostics: none')
        )
        expect(mockRoom.disconnect).toHaveBeenCalled()
    })

    it('asks the provider about the visit before ending it', () => {
        // @ts-ignore
        mockVideoContext.currentUser = { providerNo: '999998' }
        const wrapper = shallow(<EndCallButton />)
        wrapper.find(IconButton).simulate('click')

        expect(videoService.logVisit).not.toHaveBeenCalled()
        expect(mockRoom.disconnect).not.toHaveBeenCalled()
        mockVideoContext.currentUser = null
    })
})
