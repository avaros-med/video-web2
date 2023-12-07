// This function is used to provide error messages to the user that are
// different than the error messages provided by the SDK.
export default function enhanceMessage(message = '', code?: number) {
    switch (true) {
        case code === 20101: // Invalid token error
            return (
                message +
                '. Please make sure you are using the correct credentials.'
            )
        case code === 53205: // Duplicate identity
            return "Another attendee has joined the meeting using your name. If that wasn't you, please re-join the meeting with an alternate name."
        case message === 'Permission denied by system':
            return 'Unable to share your screen. Please make sure that your operating system has the correct permissions enabled for screen sharing.'
        default:
            return message
    }
}
