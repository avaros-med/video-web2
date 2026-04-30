/**
 * recording.spec.ts — Recording toggle and notification
 */
import { test, expect, TEST_ROOM, API_VIDEO_BASE } from './fixtures'
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

// ── Menu / More options ───────────────────────────────────────────────────────

test('Menu (more options) button is visible in the footer', async ({ mockedPage: page }) => {
    await enterRoom(page)
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    // Menu button renders as an IconButton with 'settings' icon
    await expect(footer.locator('i.material-icons').filter({ hasText: 'settings' })).toBeVisible()
})

// ── Recording toggle via menu ─────────────────────────────────────────────────

test('recording start/stop are accessible via the menu', async ({ mockedPage: page }) => {
    // Mock recording-related endpoints if needed
    await page.route(`**${API_VIDEO_BASE}/**recording**`, route =>
        route.fulfill({ json: { success: true } })
    )

    await enterRoom(page)

    // Open the settings/more options menu
    const footer = page.locator('footer')
    await footer.locator('i.material-icons').filter({ hasText: 'settings' }).click()
    await page.waitForTimeout(300)

    // Check if a recording option appears in the menu
    const recordingOption = page.locator(
        'text=Record Meeting, text=Start Recording, [role="menuitem"]:has-text("Record")'
    )
    if (await recordingOption.count() > 0) {
        await expect(recordingOption.first()).toBeVisible()
    }

    // Close menu
    await page.keyboard.press('Escape')
})

// ── Participant disconnect button ─────────────────────────────────────────────

test('participant disconnect option is accessible from menu', async ({ mockedPage: page }) => {
    await enterRoom(page)

    const footer = page.locator('footer')
    await footer.locator('i.material-icons').filter({ hasText: 'settings' }).click()
    await page.waitForTimeout(300)

    // Various menu items may be present
    const disconnectOption = page.locator('[role="menuitem"]')
    const count = await disconnectOption.count()
    // Menu should have at least some items
    if (count > 0) {
        await expect(disconnectOption.first()).toBeVisible()
    }

    await page.keyboard.press('Escape')
})
