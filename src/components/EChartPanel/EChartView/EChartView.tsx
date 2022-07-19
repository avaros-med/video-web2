import { SelectPatient } from './SelectPatient'
import styled from 'styled-components'

const Styles = styled.div`
    width: 100%;
`

export const EChartView = () => {
    return (
        <Styles>
            <SelectPatient />
        </Styles>
    )
}
