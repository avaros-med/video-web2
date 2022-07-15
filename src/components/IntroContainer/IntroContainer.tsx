import { makeStyles, Theme } from '@material-ui/core'
import React from 'react'
import { useLocation } from 'react-router-dom'
import Colors from '../../colors'
import { useAppState } from '../../state'
import UserMenu from './UserMenu/UserMenu'

const useStyles = makeStyles((theme: Theme) => ({
    background: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: Colors.APP_BACKGROUND,
        height: '100%',
    },
    container: {
        position: 'relative',
        flex: '1',
        [theme.breakpoints.down('sm')]: {
            height: '100%',
        },
    },
    innerContainer: {
        width: '400px',
        borderRadius: '5px',
        boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.07)',
        overflow: 'hidden',
        position: 'relative',
        margin: 'auto',
        [theme.breakpoints.down('sm')]: {
            display: 'block',
            height: '100%',
            width: '100%',
            margin: 'auto',
        },
    },
    content: {
        background: 'white',
        width: '100%',
        padding: '2em',
        flex: 1,
        [theme.breakpoints.down('sm')]: {
            height: '100%',
        },
    },
    title: {
        color: 'white',
        margin: '1em 0 0',
        [theme.breakpoints.down('sm')]: {
            margin: 0,
            fontSize: '1.1rem',
        },
    },
}))

interface IntroContainerProps {
    children: React.ReactNode
}

const IntroContainer = (props: IntroContainerProps) => {
    const classes = useStyles()
    const { user } = useAppState()
    const location = useLocation()

    return (
        <div className={classes.background}>
            {user && location.pathname !== '/login' && <UserMenu />}
            <div className={classes.container}>
                <div className={classes.innerContainer}>
                    <div className={classes.content}>{props.children}</div>
                </div>
            </div>
        </div>
    )
}

export default IntroContainer
