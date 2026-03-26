import React from 'react'
import { shallow } from 'enzyme'

import EndCallButton from './EndCallButton'
import { IconButton } from '../../UI/IconButton'

const mockRoom = {
    disconnect: jest.fn(),
}

const mockVideoContext = {
    room: mockRoom,
    currentUser: null,
    appointment: null,
}

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
        addLog: jest.fn(() => Promise.resolve()),
    },
}))

jest.mock('../../EndCallDialog/EndCallDialog', () => () => null)

describe('End Call button', () => {
    it('should disconnect from the room when clicked', () => {
        const wrapper = shallow(<EndCallButton />)
        wrapper.find(IconButton).simulate('click')
        expect(mockRoom.disconnect).toHaveBeenCalled()
    })
})
