import { makeStyles, Theme } from '@material-ui/core/styles'
import { forwardRef, useImperativeHandle } from 'react'
import BackgroundThumbnail from '../BackgroundSelectionDialog/BackgroundThumbnail/BackgroundThumbnail'
import { backgroundConfig } from '../VideoProvider/useBackgroundSettings/useBackgroundSettings'

interface Props {}

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        display: 'flex',
        width: theme.rightPanelWidth,
        height: `calc(100% - ${theme.footerHeight}px)`,
    },
    thumbnailContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        padding: '4px',
        overflowY: 'auto',

        '&:hover': {
            cursor: 'pointer',
        },
    },
}))

export const BackgroundSelectionPanel = forwardRef(({}: Props, ref: any) => {
    const classes = useStyles()

    const imageNames = backgroundConfig.imageNames
    const images = backgroundConfig.images

    // Pass references to parent component
    useImperativeHandle(ref, () => ({
        getName: () => 'Backgrounds',
    }))

    return (
        <div ref={ref} className={classes.container}>
            <div className={classes.thumbnailContainer}>
                <BackgroundThumbnail thumbnail={'none'} name={'None'} />
                <BackgroundThumbnail thumbnail={'blur'} name={'Blur'} />
                {images.map((image, index) => (
                    <BackgroundThumbnail
                        thumbnail={'image'}
                        name={imageNames[index]}
                        index={index}
                        imagePath={image}
                        key={image}
                    />
                ))}
            </div>
        </div>
    )
})
