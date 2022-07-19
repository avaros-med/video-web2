import styled from 'styled-components'
import { useEChartContext } from '../useEChartContext'
import { EncounterNoteView } from './EncounterNoteView'
import { SelectPatientView } from './SelectPatientView'

const Styles = styled.div`
    width: 100%;
`

export const EChartView = () => {
    const { demographic } = useEChartContext().demographic

    return (
        <Styles>
            {!demographic ? <SelectPatientView /> : <EncounterNoteView />}
        </Styles>
    )
}
