import React, { createContext, useContext, useReducer, useState } from 'react'
import { RecordingRules, RoomType } from '../types'
import { TwilioError } from 'twilio-video'
import {
    settingsReducer,
    initialSettings,
    Settings,
    SettingsAction,
} from './settings/settingsReducer'
import useActiveSinkId from './useActiveSinkId/useActiveSinkId'
import { useLocalStorageState } from '../hooks/useLocalStorageState/useLocalStorageState'
import usePasscodeAuth from './usePasscodeAuth/usePasscodeAuth'
import { videoService } from '../services/http/video.service'

export interface StateContextType {
    error: TwilioError | Error | null
    setError(error: TwilioError | Error | null): void
    getToken(
        name: string,
        room: string,
        passcode?: string
    ): Promise<{ room_type: RoomType; token: string }>
    user?: {
        displayName: string | undefined
        photoURL: string | undefined
        passcode?: string
    } | null
    signIn?(passcode?: string): Promise<void>
    signOut?(): Promise<void>
    isAuthReady?: boolean
    isFetching: boolean
    activeSinkId: string
    setActiveSinkId(sinkId: string): void
    settings: Settings
    dispatchSetting: React.Dispatch<SettingsAction>
    roomType?: RoomType
    updateRecordingRules(
        room_sid: string,
        rules: RecordingRules
    ): Promise<object>
    isGalleryViewActive: boolean
    setIsGalleryViewActive: React.Dispatch<React.SetStateAction<boolean>>
    maxGalleryViewParticipants: number
    setMaxGalleryViewParticipants: React.Dispatch<React.SetStateAction<number>>
}

export const StateContext = createContext<StateContextType>(null!)

export default function AppStateProvider(props: React.PropsWithChildren<{}>) {
    const [error, setError] = useState<TwilioError | null>(null)
    const [isFetching, setIsFetching] = useState(false)
    const [isGalleryViewActive, setIsGalleryViewActive] = useLocalStorageState(
        'gallery-view-active-key',
        true
    )
    const [activeSinkId, setActiveSinkId] = useActiveSinkId()
    const [settings, dispatchSetting] = useReducer(
        settingsReducer,
        initialSettings
    )
    const [roomType, setRoomType] = useState<RoomType>()
    const [
        maxGalleryViewParticipants,
        setMaxGalleryViewParticipants,
    ] = useLocalStorageState('max-gallery-participants-key', 6)

    let contextValue = {
        error,
        setError,
        isFetching,
        activeSinkId,
        setActiveSinkId,
        settings,
        dispatchSetting,
        roomType,
        isGalleryViewActive,
        setIsGalleryViewActive,
        maxGalleryViewParticipants,
        setMaxGalleryViewParticipants,
    } as StateContextType

    if (process.env.REACT_APP_SET_AUTH === 'passcode') {
        contextValue = {
            ...contextValue,
            ...usePasscodeAuth(), // eslint-disable-line react-hooks/rules-of-hooks
        }
    } else {
        contextValue = {
            ...contextValue,
            // ehr's token for the room (ehr docs/schedule-video.md §4): anyone with the room's
            // link gets one, as in ark. The room type is the build's (REACT_APP_ROOM_TYPE).
            getToken: async (identity, roomName) => {
                const { token } = await videoService.getToken(
                    roomName,
                    identity
                )
                return { token, room_type: undefined as any }
            },
            // Recording is off for video visits: ehr has no recording route.
            updateRecordingRules: async () =>
                Promise.reject(new Error('Recording is not available')),
        }
    }

    const getToken: StateContextType['getToken'] = (name, room) => {
        setIsFetching(true)
        return contextValue
            .getToken(name, room)
            .then(res => {
                setRoomType(res.room_type ?? process.env.REACT_APP_ROOM_TYPE)
                setIsFetching(false)
                return res
            })
            .catch(err => {
                setError(err)
                setIsFetching(false)
                return Promise.reject(err)
            })
    }

    const updateRecordingRules: StateContextType['updateRecordingRules'] = (
        room_sid,
        rules
    ) => {
        setIsFetching(true)
        return contextValue
            .updateRecordingRules(room_sid, rules)
            .then(res => {
                setIsFetching(false)
                return res
            })
            .catch(err => {
                setError(err)
                setIsFetching(false)
                return Promise.reject(err)
            })
    }

    return (
        <StateContext.Provider
            value={{ ...contextValue, getToken, updateRecordingRules }}
        >
            {props.children}
        </StateContext.Provider>
    )
}

export function useAppState() {
    const context = useContext(StateContext)
    if (!context) {
        throw new Error('useAppState must be used within the AppStateProvider')
    }
    return context
}
