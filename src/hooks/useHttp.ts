import { useReducer, useCallback } from 'react'

interface State {
    isLoading: boolean
    hasLoaded: boolean
    errorData: any
    responseData: any
    requestId?: number | string
    successCallback?: (...args: any) => any
    errorCallback?: (...args: any) => any
}

const initialState: State = {
    isLoading: false,
    hasLoaded: false,
    errorData: null,
    responseData: null,
    requestId: undefined,
    successCallback: undefined,
    errorCallback: undefined,
}

enum ACTION {
    SEND,
    RESPONSE,
    ERROR,
    RESET,
}

interface Action {
    type: ACTION
    payload: {
        responseData?: any
        errorData?: any
        requestId?: number | string
        successCallback?: (...args: any) => any
        errorCallback?: (...args: any) => any
    }
}

const reducer = (
    state: State,
    {
        type,
        payload: {
            responseData,
            errorData,
            requestId,
            successCallback,
            errorCallback,
        },
    }: Action
): State => {
    switch (type) {
        case ACTION.SEND:
            return {
                ...initialState,
                isLoading: true,
                requestId,
            }

        case ACTION.RESPONSE:
            return {
                ...state,
                isLoading: false,
                hasLoaded: true,
                responseData,
                errorData: null,
                requestId,
                successCallback,
            }

        case ACTION.ERROR:
            return {
                ...state,
                isLoading: false,
                hasLoaded: true,
                responseData: null,
                errorData,
                requestId,
                errorCallback,
            }

        case ACTION.RESET:
        default:
            return initialState
    }
}

export const useHttp = () => {
    const [state, dispatch] = useReducer(reducer, initialState)

    const sendRequest = useCallback(
        async (
            requestFunc: () => Promise<any>,
            requestId?: number | string,
            successCallback?: (...args: any) => any,
            errorCallback?: (...args: any) => any
        ): Promise<any> => {
            dispatch({
                type: ACTION.SEND,
                payload: {
                    requestId,
                },
            })

            return requestFunc()
                .then((responseData: any) => {
                    dispatch({
                        type: ACTION.RESPONSE,
                        payload: {
                            responseData,
                            requestId,
                            successCallback,
                        },
                    })
                    return responseData
                })
                .catch((errorData: any) => {
                    dispatch({
                        type: ACTION.ERROR,
                        payload: {
                            errorData,
                            requestId,
                            errorCallback,
                        },
                    })
                    return errorData
                })
        },
        []
    )

    return {
        isLoading: state.isLoading,
        hasLoaded: state.hasLoaded,
        responseData: state.responseData,
        errorData: state.errorData,
        requestId: state.requestId,
        successCallback: state.successCallback,
        errorCallback: state.errorCallback,
        sendRequest,
    }
}
