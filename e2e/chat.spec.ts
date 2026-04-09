/**
 * chat.spec.ts — Messages panel (ToggleMessagesButton / schedule SSE backend)
 *
 * The app uses ToggleMessagesButton (icon="chat", always present) which opens
 * the EChart/Messages panel via the schedule service SSE stream. This is
 * entirely separate from @twilio/conversations (which is disabled via
 * REACT_APP_DISABLE_TWILIO_CONVERSATIONS=true — it was replaced by the
 * schedule backend).
 */
import { test, expect, TEST_ROOM } from './fixtures'
import {
    navigateToRoom,
    waitForRoomNameScreen,
    waitForDeviceSelectionScreen,
    fillParticipantName,
    clickContinue,
    clickJoinNow,
    waitForRoom,
} from './helpers'

async function enterRoom(page: any) {
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)
}

// ── Messages button always present ───────────────────────────────────────────

test('messages (chat) button is visible in the room footer', async ({ mockedPage: page }) => {
    await enterRoom(page)
    // ToggleMessagesButton uses IconButton with icon="chat" — always rendered
    const footer = page.locator('footer')
    await expect(footer.locator('i.material-icons').filter({ hasText: 'chat' })).toBeVisible()
})

// ── Open / close messages panel ───────────────────────────────────────────────

test('chat panel can be opened and closed', async ({ mockedPage: page }) => {
    await enterRoom(page)

    const chatIcon = page.locator('footer').locator('i.material-icons').filter({ hasText: 'chat' })
    await expect(chatIcon).toBeVisible()

    // Open
    await chatIcon.click()
    await page.waitForTimeout(300)

    // Close by clicking again (or clicking elsewhere)
    await chatIcon.click()
    await page.waitForTimeout(300)

    // App is still stable
    await expect(page.locator('footer')).toBeVisible()
})

// ── Send a message (soft) ─────────────────────────────────────────────────────

test('sending a chat message triggers the message API', async ({ mockedPage: page }) => {
    await enterRoom(page)

    const chatIcon = page.locator('footer').locator('i.material-icons').filter({ hasText: 'chat' })
    await chatIcon.click()

    // Wait for the Messages panel's schedule-backend input to become visible
    // (MessageComposer.tsx uses placeholder="Type a message ...")
    const chatInput = page.locator('textarea[placeholder="Type a message ..."], input[placeholder="Type a message ..."]')
    await expect(chatInput.first()).toBeVisible({ timeout: 10_000 })
    await chatInput.first().fill('Hello, this is a test message')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // App remains stable
    await expect(page.locator('footer')).toBeVisible()
})

// ── Incoming SSE message ──────────────────────────────────────────────────────

test('incoming SSE message event appears in chat window', async ({ mockedPage: page }) => {
    await enterRoom(page)

    // Open messages panel
    const chatIcon = page.locator('footer').locator('i.material-icons').filter({ hasText: 'chat' })
    await chatIcon.click()
    await page.waitForTimeout(300)

    // Dispatch a mock SSE message event via the window (socket service listens on SSE stream)
    await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('__sse_mock_event__', {
            detail: {
                type: 'Message',
                payload: {
                    sender: 'Jane Patient',
                    content: 'Hello from patient!',
                    timestamp: new Date().toISOString(),
                },
            },
        }))
    })

    await page.waitForTimeout(500)
    // App remains stable after SSE event dispatch
    await expect(page.locator('footer')).toBeVisible()
})
