import styled from 'styled-components'
import { useAvsSocketContext } from '../../../hooks/useAvsSocketContext/useAvsSocketContext'
import { TextHintStyles } from '../../UI/styles/styles'
import { MessageComposer } from './MessageComposer'
import { MessagesList } from './MessagesList'

const Styles = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;

    .messages-list-wrapper {
        flex: 1;
        margin-bottom: 16px;
    }
`

export const MessagesView = () => {
    const { hasNetworkError } = useAvsSocketContext().networkError

    return (
        <Styles>
            {!hasNetworkError ? (
                <>
                    <MessagesList classes="messages-list-wrapper" />
                    <MessageComposer />
                </>
            ) : (
                <ErrorState />
            )}
        </Styles>
    )
}

const ErrorStateStyles = styled.div`
    width: 100%;
    height: 100%;
    font-weight: 500;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    img {
        width: 210px;
        height: auto;
        display: block;
    }
`

const ErrorState = () => {
    return (
        <ErrorStateStyles>
            <img
                src={`${process.env.PUBLIC_URL}/assets/images/illustration-error.svg`}
                alt="Chat"
            />
            <TextHintStyles className="text-center w-75 mt-4">
                Messaging is unavailable at this time, please try again later
            </TextHintStyles>
        </ErrorStateStyles>
    )
}
