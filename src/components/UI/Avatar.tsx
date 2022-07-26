import styled from 'styled-components'

interface Props {
    classes?: string
    intent?: 'sm' | 'lg'
    name: string
}

const Styles = styled.div`
    min-width: 40px;
    min-height: 40px;
    max-width: 40px;
    max-height: 40px;
    background: white;
    border-radius: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;

    &.lg {
        min-width: 90px;
        min-height: 90px;
        max-width: 90px;
        max-height: 90px;
        font-size: 32px;
        font-weight: 500;
    }
`

export const Avatar = ({ classes, intent, name }: Props) => {
    const nameParts = name?.split(' ')
    const initials = (name?.length
        ? nameParts
              ?.slice(0, 3)
              ?.map(i => i.charAt(0))
              .join('') ?? name.substring(0, 2)
        : ''
    ).toUpperCase()

    return (
        <Styles className={`${classes ?? ''} ${intent ?? 'sm'}`}>
            <span>{initials}</span>
        </Styles>
    )
}
