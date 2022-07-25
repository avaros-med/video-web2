import { useCallback, useEffect, useState } from 'react'
import { oscarService } from '../services/http/oscar.service'
import { CurrentUser } from '../services/models/CurrentUser.model'

export const useCurrentUser = () => {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

    const getCurrentUser = useCallback(() => {
        oscarService.getCurrentUser().then(_currentUser => {
            setCurrentUser(_currentUser)
        })
    }, [])

    // Get current user on load
    useEffect(() => {
        getCurrentUser()
    }, [getCurrentUser])

    return {
        currentUser,
    }
}
