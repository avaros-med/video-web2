import { eventBus } from './eventBus.service'

export class AttachmentAuthenticated {
    static action = 'AttachmentAuthenticated'
    static emit = () =>
        eventBus.emit({
            action: AttachmentAuthenticated.action,
        })
}
