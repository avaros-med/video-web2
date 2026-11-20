/**
 * screen-share.spec.ts — Screen sharing toggle
 */
import { test, expect } from './fixtures'
import {
    openRoom,
    waitForRoomNameScreen,
    waitForDeviceSelectionScreen,
    fillParticipantName,
    clickContinue,
    clickJoinNow,
    waitForRoom,
} from './helpers'

async function enterRoom(page: any, visit: { roomName: string }) {
    await openRoom(page, visit.roomName)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Jane Patient')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)
}

// ── Screen share button visibility ────────────────────────────────────────────

test('screen share button is visible in the room footer on desktop', async ({ patientPage: page, visit }) => {
    await enterRoom(page, visit)
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    // Screen share icon renders as 'screen_share' material icon on desktop
    await expect(footer.locator('i.material-icons').filter({ hasText: 'screen_share' })).toBeVisible()
})

// ── Start screen sharing ──────────────────────────────────────────────────────

test('clicking screen share button triggers getDisplayMedia', async ({ patientPage: page, visit }) => {
    // getDisplayMedia is already mocked by TWILIO_MOCK_SCRIPT in fixtures.ts
    await enterRoom(page, visit)

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

test('"Stop Sharing" button stops screen share and removes banner', async ({ patientPage: page, visit }) => {
    // getDisplayMedia is already mocked by TWILIO_MOCK_SCRIPT in fixtures.ts
    await enterRoom(page, visit)

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
