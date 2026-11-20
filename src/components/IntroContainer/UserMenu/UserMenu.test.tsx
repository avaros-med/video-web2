import React from 'react'
import { Link } from '@material-ui/core'
import { shallow } from 'enzyme'
import { useAppState } from '../../../state'
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import UserMenu from './UserMenu'

jest.mock('../../../state')
jest.mock('../../../hooks/useVideoContext/useVideoContext')

const mockUseAppState = useAppState as jest.Mock<any>
const mockUseVideoContext = useVideoContext as jest.Mock<any>

describe('the UserMenu component', () => {
    const mockTrack = { stop: jest.fn() }
    mockUseVideoContext.mockImplementation(() => ({ localTracks: [mockTrack] }))
    const mockSignOut = jest.fn(() => Promise.resolve())
    mockUseAppState.mockImplementation(() => ({
        user: { displayName: 'Test User' },
        signOut: mockSignOut,
    }))

    describe('when logged in with passcode auth', () => {
        beforeAll(() => {
            process.env.REACT_APP_SET_AUTH = 'passcode'
        })

        it('should stop all tracks and signout when the Logout link is clicked', () => {
            const wrapper = shallow(<UserMenu />)
            wrapper.find(Link).simulate('click')
            expect(mockTrack.stop).toHaveBeenCalled()
            expect(mockSignOut).toHaveBeenCalled()
        })
    })
})
