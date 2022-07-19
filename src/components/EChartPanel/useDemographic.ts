import { useState } from 'react'
import { Demographic } from '../../services/models/Demographic.model'

export interface DemographicHookState {
    demographic: Demographic | null
    setDemographic: (demographic: Demographic | null) => void
    clearDemographic: () => void
}

export const useDemographic = () => {
    const [demographic, setDemographic] = useState<Demographic | null>(null)

    const clearDemographic = () => setDemographic(null)

    return { demographic, setDemographic, clearDemographic }
}
