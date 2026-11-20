import React from 'react'
import { act, renderHook } from '@testing-library/react-hooks'

import AppStateProvider, { useAppState } from './index'
import usePasscodeAuth from './usePasscodeAuth/usePasscodeAuth'
import { videoService } from '../services/http/video.service'

jest.mock('./usePasscodeAuth/usePasscodeAuth', () =>
    jest.fn(() => ({ user: 'passcodeUser' }))
)
jest.mock('./useActiveSinkId/useActiveSinkId.ts', () => () => [
    'default',
    () => {},
])

jest.mock('../services/http/video.service', () => ({
    videoService: {
        getToken: jest.fn(() =>
            Promise.resolve({
                token: 'mockVideoToken',
                identity: 'testname_123456',
                provider: false,
            })
        ),
    },
}))

const mockUsePasscodeAuth = usePasscodeAuth as jest.Mock<any>

const wrapper: React.FC = ({ children }) => (
    <AppStateProvider>{children}</AppStateProvider>
)

describe('the useAppState hook', () => {
    beforeEach(jest.clearAllMocks)
    beforeEach(() => (process.env = {} as any))

    it('should set an error', () => {
        const { result } = renderHook(useAppState, { wrapper })
        act(() => result.current.setError(new Error('testError')))
        expect(result.current.error!.message).toBe('testError')
    })

    it('should throw an error if used outside of AppStateProvider', () => {
        const { result } = renderHook(useAppState)
        expect(result.error.message).toEqual(
            'useAppState must be used within the AppStateProvider'
        )
    })

    it("gets the room's token from ehr, for the name typed", async () => {
        const { result } = renderHook(useAppState, { wrapper })

        let token
        await act(async () => {
            token = await result.current.getToken(
                'testname',
                'braamc_999998-abc'
            )
        })

        expect(token).toEqual({ token: 'mockVideoToken', room_type: undefined })
        expect(videoService.getToken).toHaveBeenCalledWith(
            'braamc_999998-abc',
            'testname'
        )
    })

    describe('with auth disabled', () => {
        it('should not use the passcode auth hook', async () => {
            delete process.env.REACT_APP_SET_AUTH
            renderHook(useAppState, { wrapper })
            expect(usePasscodeAuth).not.toHaveBeenCalled()
        })
    })

    describe('with passcode auth enabled', () => {
        it('should use the usePasscodeAuth hook', async () => {
            process.env.REACT_APP_SET_AUTH = 'passcode'
            const { result } = renderHook(useAppState, { wrapper })
            expect(usePasscodeAuth).toHaveBeenCalled()
            expect(result.current.user).toBe('passcodeUser')
        })
    })

    describe('the getToken function', () => {
        it('should set isFetching to true after getToken is called, and false after getToken succeeds', async () => {
            // Using passcode auth because it's easier to mock the getToken function
            process.env.REACT_APP_SET_AUTH = 'passcode'
            mockUsePasscodeAuth.mockImplementation(() => {
                return {
                    getToken: () =>
                        new Promise(resolve => {
                            // Using fake timers so we can control when the promise resolves
                            setTimeout(
                                () => resolve({ text: () => 'mockVideoToken' }),
                                10
                            )
                        }),
                }
            })

            jest.useFakeTimers()

            const { result, waitForNextUpdate } = renderHook(useAppState, {
                wrapper,
            })

            expect(result.current.isFetching).toEqual(false)

            await act(async () => {
                result.current.getToken('test', 'test')
                await waitForNextUpdate()
                expect(result.current.isFetching).toEqual(true)
                jest.runOnlyPendingTimers()
                await waitForNextUpdate()
                expect(result.current.isFetching).toEqual(false)
            })
        })

        it('should set isFetching to true after getToken is called, and false after getToken fails', async () => {
            process.env.REACT_APP_SET_AUTH = 'passcode'
            mockUsePasscodeAuth.mockImplementation(() => {
                return {
                    getToken: () =>
                        new Promise((_, reject) => {
                            setTimeout(
                                () => reject({ text: () => 'mockVideoToken' }),
                                10
                            )
                        }),
                }
            })

            jest.useFakeTimers()

            const { result, waitForNextUpdate } = renderHook(useAppState, {
                wrapper,
            })

            expect(result.current.isFetching).toEqual(false)

            await act(async () => {
                result.current.getToken('test', 'test').catch(() => {})
                await waitForNextUpdate()
                expect(result.current.isFetching).toEqual(true)
                jest.runOnlyPendingTimers()
                await waitForNextUpdate()
                expect(result.current.isFetching).toEqual(false)
            })
        })
    })
})
