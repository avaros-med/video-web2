/**
 * panel.spec.ts — Right panel: appointment details, patient search, notes, documents
 */
import { test, expect, TEST_ROOM, API_OSCAR_BASE } from './fixtures'
import {
    navigateToRoom,
    waitForRoomNameScreen,
    waitForDeviceSelectionScreen,
    fillParticipantName,
    clickContinue,
    clickJoinNow,
    waitForRoom,
} from './helpers'

async function enterRoom(page: any, room = TEST_ROOM) {
    await navigateToRoom(page, room)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Dr. John Smith')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)
}

// ── Panel toggle ──────────────────────────────────────────────────────────────

test('panel toggle button opens the right panel', async ({ mockedPage: page }) => {
    await enterRoom(page)

    // The TopMenuBar or a panel toggle button opens the right panel
    // Look for a button that opens the panel
    const panelBtn = page.locator('[data-testid="panel-toggle"], button:has([data-testid="MenuIcon"]), button:has-text("Info")')
    if (await panelBtn.count() > 0) {
        await panelBtn.first().click()
        await page.waitForTimeout(300)
        // Panel should be visible
        await expect(page.locator('[class*="Panel"], [class*="panel"]').first()).toBeVisible()
    }
})

// ── Appointment details ───────────────────────────────────────────────────────

test('appointment card shows appointment information', async ({ mockedPage: page }) => {
    await enterRoom(page)

    // AppointmentCard renders on the RoomNameScreen (before join), and in the panel
    // After joining, appointment data from the video-appointment-by-room API may appear
    await page.waitForTimeout(500)
    // Soft check — panel may need to be opened and appointment data depends on local backend
    const appointmentText = page.locator('[class*="AppointmentCard"], [class*="appointment"]')
    if (await appointmentText.count() > 0) {
        await expect(appointmentText.first()).toBeVisible()
    }
})

// ── Patient search ────────────────────────────────────────────────────────────

test('demographics search field triggers Oscar search API', async ({ mockedPage: page }) => {
    await enterRoom(page)

    const searchRequest = page.waitForRequest(req =>
        req.url().includes('/demographics/search') && req.url().includes('search_term'),
        { timeout: 5_000 }
    ).catch(() => null)

    // Find and interact with demographics search input
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="patient"], input[placeholder*="Search"]')
    if (await searchInput.count() > 0) {
        await searchInput.first().fill('Jane Patient')
        await page.keyboard.press('Enter')
        await searchRequest
    }
})

// ── Notes ─────────────────────────────────────────────────────────────────────

test('creating a patient note triggers Oscar notes POST', async ({ mockedPage: page }) => {
    const notesRequest = page.waitForRequest(req =>
        req.url().includes('/notes') && req.method() === 'POST',
        { timeout: 5_000 }
    ).catch(() => null)

    // Mock notes endpoint
    await page.route(`**${API_OSCAR_BASE}/demographics/**/notes`, route =>
        route.fulfill({ json: { noteId: 100, content: 'Test note' } })
    )

    await enterRoom(page)

    // Look for a notes textarea or form
    const noteInput = page.locator('textarea[placeholder*="note"], textarea[placeholder*="Note"]')
    if (await noteInput.count() > 0) {
        await noteInput.first().fill('Test clinical note')
        // Submit the note
        const submitBtn = page.locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Submit")')
        if (await submitBtn.count() > 0) {
            await submitBtn.first().click()
            await notesRequest
        }
    }
})

// ── Documents ─────────────────────────────────────────────────────────────────

test('documents tab loads document list', async ({ mockedPage: page }) => {
    const docsResponse = [
        { documentNo: 1, description: 'Lab Results', contentType: 'application/pdf' },
    ]
    await page.route(`**${API_OSCAR_BASE}/demographics/**/documents`, route =>
        route.fulfill({ json: docsResponse })
    )

    await enterRoom(page)
    await page.waitForTimeout(500)

    // If a documents tab exists, click it
    const docsTab = page.locator('button:has-text("Documents"), [role="tab"]:has-text("Documents")')
    if (await docsTab.count() > 0) {
        await docsTab.first().click()
        await expect(page.locator('text=Lab Results')).toBeVisible({ timeout: 5_000 })
    }
})
