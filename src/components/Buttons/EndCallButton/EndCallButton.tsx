import useVideoContext from '../../../hooks/useVideoContext/useVideoContext'
import { IconButton } from '../../UI/IconButton'

export default function EndCallButton(props: { className?: string }) {
    const { room } = useVideoContext()

    return (
        <IconButton
            classes={props.className}
            intent={'endcall'}
            icon="call_end"
            onClick={() => room!.disconnect()}
            tooltipContent="End call"
            data-cy-disconnect
        />
    )
}
