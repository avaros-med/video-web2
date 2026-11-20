import moment from 'moment'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import useVideoContext from '../../hooks/useVideoContext/useVideoContext'
import { DemographicHookState, useDemographic } from './useDemographic'
import { HeaderTabsHookState, useHeaderTabs } from './useHeaderTabs'

interface ContextState {
    headerTabs: HeaderTabsHookState
    demographic: DemographicHookState
    note: {
        note: string
        setNote(note: string): void
    }
}

const LocalStateContext = createContext<ContextState>(null!)

// Provider
export function EChartContextProvider({ children }: any) {
    const headerTabsHookState = useHeaderTabs()
    const demographicHookState = useDemographic()
    const [note, setNote] = useState<string>(() => makeInitialNote())
    const { videoRoom } = useVideoContext()
    const { setDemographic } = demographicHookState
    const hasOpenedOnPatientRef = useRef<boolean>(false)

    // The panel opens on the visit's patient, which ehr answers only to the signed-in
    // provider (ehr docs/schedule-video.md V20); the search is still there to change it.
    useEffect(() => {
        if (hasOpenedOnPatientRef.current || !videoRoom?.patient) {
            return
        }
        hasOpenedOnPatientRef.current = true
        setDemographic(videoRoom.patient)
    }, [videoRoom, setDemographic])

    return (
        <LocalStateContext.Provider
            value={{
                headerTabs: headerTabsHookState,
                demographic: demographicHookState,
                note: {
                    note,
                    setNote,
                },
            }}
        >
            {children}
        </LocalStateContext.Provider>
    )
}

// Consumer
export function useEChartContext() {
    return useContext(LocalStateContext)
}

export const MOMENT_DATETIME_FORMAT = 'MMM. D, YYYY, h:mma' // Jan. 1, 2000, 3:15pm

const makeInitialNote = () => {
    const date = moment().format(MOMENT_DATETIME_FORMAT)
    return `[${date}: Video Visit]\n\n`
}
