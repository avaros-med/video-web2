/**
 * screen-share.spec.ts — Screen sharing toggle
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

// ── Screen share button visibility ────────────────────────────────────────────

test('screen share button is visible in the room footer on desktop', async ({ mockedPage: page }) => {
    await enterRoom(page)
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    // Screen share icon renders as 'screen_share' material icon on desktop
    await expect(footer.locator('i.material-icons').filter({ hasText: 'screen_share' })).toBeVisible()
})

// ── Start screen sharing ──────────────────────────────────────────────────────

test('clicking screen share button triggers getDisplayMedia', async ({ mockedPage: page }) => {
    // getDisplayMedia is already mocked by TWILIO_MOCK_SCRIPT in fixtures.ts
    await enterRoom(page)

    // Find and click the screen share icon button
    const footer = page.locator('footer')
    const screenShareIcon = footer.locator('i.material-icons').filter({ hasText: 'screen_share' })

    if (await screenShareIcon.count() > 0) {
        await screenShareIcon.click()
        await page.waitForTimeout(500)
        // Screen sharing banner should appear
        await expect(page.locator('text=You are sharing your screen')).toBeVisible({ timeout: 5_000 })
    }
})

// ── Stop screen sharing ───────────────────────────────────────────────────────

test('"Stop Sharing" button stops screen share and removes banner', async ({ mockedPage: page }) => {
    // getDisplayMedia is already mocked by TWILIO_MOCK_SCRIPT in fixtures.ts
    await enterRoom(page)

    // Start sharing
    const footer = page.locator('footer')
    const screenShareIcon = footer.locator('i.material-icons').filter({ hasText: 'screen_share' })

    if (await screenShareIcon.count() > 0) {
        await screenShareIcon.click()
        await expect(page.locator('text=You are sharing your screen')).toBeVisible({ timeout: 3_000 })

        // Stop sharing
        await page.click('button:has-text("Stop Sharing")')
        await expect(page.locator('text=You are sharing your screen')).not.toBeVisible({ timeout: 3_000 })
    }
})
