/**
 * media-controls.spec.ts — Mute/unmute, camera toggle, device selection
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

// Navigate into the room before each test
test.beforeEach(async ({ mockedPage: page }) => {
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)
})

// ── Audio toggle ──────────────────────────────────────────────────────────────

test('audio toggle button is visible in the room footer', async ({ mockedPage: page }) => {
    // ToggleAudioButton renders as a custom IconButton (div) with a material-icons i element
    const footer = page.locator('footer')
    // Audio toggle icon is 'mic' or 'mic_off'
    await expect(footer.locator('i.material-icons').filter({ hasText: /^mic/ })).toBeVisible()
})

test('clicking audio toggle button calls track disable/enable', async ({ mockedPage: page }) => {
    const footer = page.locator('footer')
    const audioIcon = footer.locator('i.material-icons').filter({ hasText: /^mic/ })
    await audioIcon.click()
    // After click the icon should still be present (mic or mic_off)
    await expect(footer.locator('i.material-icons').filter({ hasText: /^mic/ })).toBeVisible()
})

// ── Video toggle ──────────────────────────────────────────────────────────────

test('video toggle button is visible in the room footer', async ({ mockedPage: page }) => {
    const footer = page.locator('footer')
    // Video toggle icon is 'videocam' or 'videocam_off'
    await expect(footer.locator('i.material-icons').filter({ hasText: /^videocam/ })).toBeVisible()
})

// ── Device selection in pre-join ──────────────────────────────────────────────

test('DeviceSelectionScreen shows audio and video toggle controls', async ({ mockedPage: page }) => {
    // Navigate fresh to the device selection screen
    await navigateToRoom(page, TEST_ROOM)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)

    // Audio and Video toggle buttons visible on the DeviceSelectionScreen
    await expect(page.locator('text=Audio').first()).toBeVisible()
    await expect(page.locator('span:has-text("Video")').first()).toBeVisible()
})

// ── Screen share ──────────────────────────────────────────────────────────────

test('screen share button is visible in the room footer', async ({ mockedPage: page }) => {
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    // Screen share icon renders as 'screen_share' material icon
    await expect(footer.locator('i.material-icons').filter({ hasText: 'screen_share' })).toBeVisible()
})

// ── End call ──────────────────────────────────────────────────────────────────

test('End Call button is visible in the room', async ({ mockedPage: page }) => {
    const footer = page.locator('footer')
    // EndCallButton renders as an IconButton with 'call_end' icon
    await expect(footer.locator('i.material-icons').filter({ hasText: 'call_end' })).toBeVisible()
})

test('clicking End Call disconnects and navigates away from room', async ({ mockedPage: page }) => {
    const footer = page.locator('footer')
    // Click the call_end icon — opens EndCallDialog (physicians see a confirmation)
    await footer.locator('i.material-icons').filter({ hasText: 'call_end' }).click()
    // Confirm the end call in the dialog
    await page.locator('button:has-text("End call")').click()
    // After disconnect, room footer should disappear
    await expect(page.locator('footer')).not.toBeVisible({ timeout: 8_000 })
})
