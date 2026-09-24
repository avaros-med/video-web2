import React from 'react'
import { mount } from 'enzyme'
import MediaAlertCallout, {
    MEDIA_ANCHOR_ATTRIBUTE,
    TONE_COLORS,
} from './MediaAlertCallout'

describe('the MediaAlertCallout component', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('should render nothing when closed', () => {
        const wrapper = mount(
            <MediaAlertCallout open={false} tone="error" title="Hidden" />
        )
        expect(wrapper.html()).toBeNull()
    })

    it('should render the title, message and action in the tone colour', () => {
        const onClick = jest.fn()
        const wrapper = mount(
            <MediaAlertCallout
                open
                tone="error"
                title="No one can hear you"
                message="Your microphone stopped sending audio."
                action={{ label: 'Reconnect microphone', onClick }}
            />
        )
        expect(wrapper.text()).toContain('No one can hear you')
        expect(wrapper.text()).toContain(
            'Your microphone stopped sending audio.'
        )
        const root = wrapper.find('[role="alert"]').first()
        expect(root.prop('style')).toMatchObject({
            background: TONE_COLORS.error,
        })
        const button = wrapper.find('button').first()
        expect(button.text()).toBe('Reconnect microphone')
        expect(button.prop('style')).toMatchObject({ color: TONE_COLORS.error })
        button.simulate('click')
        expect(onClick).toHaveBeenCalled()
    })

    it('should show the busy label and disable the action while busy', () => {
        const wrapper = mount(
            <MediaAlertCallout
                open
                tone="error"
                title="t"
                action={{
                    label: 'Reconnect microphone',
                    busyLabel: 'Reconnecting…',
                    isBusy: true,
                    onClick: jest.fn(),
                }}
            />
        )
        const button = wrapper.find('button').first()
        expect(button.text()).toBe('Reconnecting…')
        expect(button.prop('disabled')).toBe(true)
    })

    it('should call onClose from the dismiss button and use role=status for info', () => {
        const onClose = jest.fn()
        const wrapper = mount(
            <MediaAlertCallout open tone="info" title="t" onClose={onClose} />
        )
        expect(wrapper.find('[role="status"]').exists()).toBe(true)
        wrapper.find('button[aria-label="Dismiss"]').simulate('click')
        expect(onClose).toHaveBeenCalled()
    })

    it('should point a caret at the anchor element when one is present', () => {
        const anchor = document.createElement('span')
        anchor.setAttribute(MEDIA_ANCHOR_ATTRIBUTE, 'mic')
        anchor.getBoundingClientRect = () =>
            ({ left: 100, width: 40, height: 40 } as DOMRect)
        document.body.appendChild(anchor)

        const wrapper = mount(
            <MediaAlertCallout open tone="error" title="t" anchor="mic" />
        )
        wrapper.update()
        const caret = wrapper
            .find('div')
            .filterWhere(
                d =>
                    (d.prop('className') as string | undefined)?.includes(
                        'caret'
                    ) ?? false
            )
        expect(caret.exists()).toBe(true)
    })

    it('should treat the auto-hide timeout as a dismissal', () => {
        jest.useFakeTimers()
        const onClose = jest.fn()
        mount(
            <MediaAlertCallout
                open
                tone="info"
                title="You may not be hearing Patient"
                onClose={onClose}
                autoHideMs={20000}
            />
        )

        // Timing out must go through the same handler as the close control, so a
        // caller that records dismissals does not see the alert return on the very
        // next poll.
        expect(onClose).not.toHaveBeenCalled()
        jest.advanceTimersByTime(20000)
        expect(onClose).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
    })
})
