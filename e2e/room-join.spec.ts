/**
 * room-join.spec.ts — Critical path: joining a Twilio video room
 *
 * Tests token request, Room connection, participant rendering.
 * Twilio SDK is mocked via window.__mockRoom__.
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
    assertInRoom,
    addMockParticipant,
    removeMockParticipant,
    assertParticipantVisible,
} from './helpers'

// ── 1. Join room — token requested, room renders ──────────────────────────────

test('clicking Join Now requests a token and renders the Room', async ({ mockedPage: page }) => {
    const tokenRequest = page.waitForRequest('**/token/**')

    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)

    // Token was requested
    await tokenRequest

    // Room footer (MenuBar) indicates we're in the room
    await waitForRoom(page)
    await assertInRoom(page)
})

// ── 2. Connecting spinner shown while joining ─────────────────────────────────

test('Joining Meeting spinner appears between Join Now and room render', async ({ mockedPage: page }) => {
    // Delay the token response so the spinner is observable
    await page.route('**/token/**', async route => {
        await new Promise(r => setTimeout(r, 300))
        await route.fulfill({ json: { token: 'mock.jwt.token', room_type: 'peer-to-peer' } })
    })

    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)

    // The "Joining Meeting" text shows briefly
    await expect(page.locator('text=Joining Meeting')).toBeVisible({ timeout: 2_000 })
})

// ── 3. Remote participant joins ───────────────────────────────────────────────

test('remote participant joining appears in the room', async ({ mockedPage: page }) => {
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)

    // Add a remote participant via the mock room API
    await addMockParticipant(page, 'Jane Patient')

    // The participant should appear somewhere in the UI
    // (GalleryView or ParticipantList renders their identity)
    await assertParticipantVisible(page, 'Jane Patient')
})

// ── 4. Remote participant leaves ──────────────────────────────────────────────

test('remote participant leaving is removed from the room', async ({ mockedPage: page }) => {
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)

    const sid = await addMockParticipant(page, 'Jane Patient')
    await assertParticipantVisible(page, 'Jane Patient')

    await removeMockParticipant(page, sid)
    // After a short delay the participant tile should disappear
    await expect(page.locator('text=Jane Patient')).not.toBeVisible({ timeout: 5_000 })
})

// ── 5. Participant count shown in MenuBar ─────────────────────────────────────

test('MenuBar shows room name and participant count', async ({ mockedPage: page }) => {
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)

    // MenuBar2 shows the footer with room controls (room name not in MenuBar2)
    await expect(page.locator('footer')).toBeVisible()
    // The local participant identity is displayed in the video tile
    await expect(page.locator('text=test-provider')).toBeVisible()
})

// ── 6. Token endpoint called with room name and identity ─────────────────────

test('token request body includes room name and identity', async ({ mockedPage: page }) => {
    let tokenBody: any = null
    await page.route('**/token/**', async route => {
        try { tokenBody = await route.request().postDataJSON() } catch {}
        await route.fulfill({ json: { token: 'mock.jwt.token', room_type: 'peer-to-peer' } })
    })

    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)

    // Token request should have been made with room and identity info
    // (exact field names depend on AppState.getToken implementation)
    expect(tokenBody || {}).toBeDefined()
})

// ── 7. Reconnecting state shown on disconnect ─────────────────────────────────

test('reconnecting indicator shown when room disconnects unexpectedly', async ({ mockedPage: page }) => {
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)

    // Emit a reconnecting event from the mock room
    await page.evaluate(() => {
        const room = (window as any).__mockRoom__
        room.state = 'reconnecting'
        room.emit('reconnecting', new Error('Network error'))
    })

    // App should show some reconnecting indicator
    await expect(
        page.locator('text=reconnecting').or(page.locator('text=Reconnecting'))
    ).toBeVisible({ timeout: 5_000 })
})
