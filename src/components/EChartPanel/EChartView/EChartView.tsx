import styled from 'styled-components'
import { useEChartContext } from '../useEChartContext'
import { SelectPatient } from './SelectPatient'

const Styles = styled.div`
    width: 100%;
`

export const EChartView = () => {
    const { demographic } = useEChartContext().demographic

    return (
        <Styles>
            {!demographic ? <SelectPatient /> : <div>Encounter note</div>}
        </Styles>
    )
}
