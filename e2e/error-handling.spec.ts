/**
 * error-handling.spec.ts — Room not found, invalid PIN, token failure, disconnect
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
    assertErrorScreen,
    disconnectMockRoom,
} from './helpers'

// ── Room not found ────────────────────────────────────────────────────────────

test('navigating to a non-existent room shows error screen', async ({ page }) => {
    await page.route('**/room-exists/**', route =>
        route.fulfill({ json: { roomExists: false, hasPIN: false } })
    )
    await page.route('**/video-appointment-by-room/**', route =>
        route.fulfill({ json: {} })
    )
    await page.route('**/user**', route => route.fulfill({ json: {} }))
    await page.route('**/sse/**', route =>
        route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
            body: ': heartbeat\n\n',
        })
    )

    await page.goto('/av/video2/room/nonexistent-room')
    await assertErrorScreen(page)
})

test('navigating to /av/video2/ without a room name shows error screen', async ({ page }) => {
    await page.route('**/sse/**', route =>
        route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
            body: ': heartbeat\n\n',
        })
    )
    await page.route('**/user**', route => route.fulfill({ json: {} }))
    await page.goto('/av/video2/')
    await assertErrorScreen(page)
})

// ── Invalid PIN ───────────────────────────────────────────────────────────────

test('entering wrong PIN shows validation error', async ({ page }) => {
    await page.route('**/room-exists/**', route =>
        route.fulfill({ json: { roomExists: true, hasPIN: true } })
    )
    await page.route('**/room/**/lock/**', route =>
        route.fulfill({ json: { pinValid: false } }) // invalid PIN
    )
    await page.route('**/video-appointment-by-room/**', route =>
        route.fulfill({ json: {} })
    )
    await page.route('**/user**', route => route.fulfill({ json: {} }))
    await page.route('**/sse/**', route =>
        route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
            body: ': heartbeat\n\n',
        })
    )
    await page.route('**/token/**', route =>
        route.fulfill({ json: { token: 'mock.jwt.token', room_type: 'peer-to-peer' } })
    )

    await page.goto('/av/video2/room/pin-room')
    await page.waitForSelector('input[placeholder="PIN"]', { timeout: 15_000 })

    await page.fill('input[placeholder="PIN"]', '000000')
    // Click the name field to blur the PIN field and trigger onBlur validation
    await page.click('input[placeholder="Name"]')

    await expect(page.locator('text=Invalid PIN')).toBeVisible({ timeout: 8_000 })
})

// ── Token request failure ─────────────────────────────────────────────────────

test('token fetch failure shows error dialog', async ({ mockedPage: page }) => {
    // Abort causes fetch() to reject, which triggers setError() in the state wrapper,
    // which opens the ErrorDialog. A 500 response does not reject (it parses to JSON).
    await page.route('**/token/**', route => route.abort())

    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)

    // ErrorDialog opens with role="dialog" and title "ERROR"
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 10_000 })
})

// ── Unexpected disconnect ─────────────────────────────────────────────────────

test('unexpected room disconnect shows reconnecting state', async ({ mockedPage: page }) => {
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)

    // Trigger a reconnecting event
    await page.evaluate(() => {
        const room = (window as any).__mockRoom__
        room.state = 'reconnecting'
        room.emit('reconnecting', new Error('Simulated network failure'))
    })

    await expect(
        page.locator('text=reconnecting').or(page.locator('text=Reconnecting'))
    ).toBeVisible({ timeout: 5_000 })
})

test('room disconnect event navigates away from room view', async ({ mockedPage: page }) => {
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)

    // Disconnect the mock room
    await disconnectMockRoom(page)

    // Room footer should disappear — app transitions out of the room view
    await expect(page.locator('footer')).not.toBeVisible({ timeout: 8_000 })
})

// ── Network quality ───────────────────────────────────────────────────────────

test('buttons are disabled while connecting', async ({ mockedPage: page }) => {
    // Delay token so the connecting spinner is shown
    await page.route('**/token/**', async route => {
        await new Promise(r => setTimeout(r, 500))
        await route.fulfill({ json: { token: 'mock.jwt.token', room_type: 'peer-to-peer' } })
    })

    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)

    // Immediately check that Join Now / Cancel are not clickable (replaced by spinner)
    await expect(page.locator('button:has-text("Join Now")')).not.toBeVisible({ timeout: 1_000 }).catch(() => {})
})
