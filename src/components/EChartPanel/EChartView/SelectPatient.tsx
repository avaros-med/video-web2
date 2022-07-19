import styled from 'styled-components'
import { TextHintStyles } from '../../UI/styles/styles'

const Styles = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 500;

    img {
        display: block;
    }
`

export const SelectPatient = () => {
    return (
        <Styles>
            <img
                src={`${process.env.PUBLIC_URL}/assets/images/illustration-search.svg`}
                alt="Search Patient"
            />
            <TextHintStyles className="text-center w-75 mt-3">
                Search and select a patient before writing encounter notes
            </TextHintStyles>
        </Styles>
    )
}
