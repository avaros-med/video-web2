/**
 * Shared helpers for video-web2 E2E tests.
 *
 * All API calls (token, SSE, Oscar) go to real local services.
 * Only the Twilio Video SDK is mocked (no WebRTC in headless Chromium).
 *
 * Required local services:
 *   - video-web2 dev server: NODE_OPTIONS=--openssl-legacy-provider PORT=3002 npm start
 *   - Schedule service:      task sv:run -- schedule  (port 8810)
 *   - Oscar EMR:             localhost:8080
 */

import { Page, expect } from '@playwright/test'
import { VIDEO_BASE, TEST_ROOM, TWILIO_MOCK_SCRIPT } from './fixtures'

// ── Navigation ────────────────────────────────────────────────────────────────

export async function navigateToRoom(page: Page, roomName = TEST_ROOM) {
    // Set the room name for the Twilio mock before page load
    await page.addInitScript(`window.__E2E_ROOM_NAME__ = '${roomName}';`)
    await page.goto(`${VIDEO_BASE}/room/${roomName}`)
}

export async function navigateToLogin(page: Page) {
    await page.goto(`${VIDEO_BASE}/login`)
}

// ── Pre-join screens ──────────────────────────────────────────────────────────

export async function waitForRoomNameScreen(page: Page) {
    await page.waitForSelector('text=Your Name', { timeout: 20_000 })
}

export async function waitForDeviceSelectionScreen(page: Page) {
    await page.waitForSelector('text=Media Devices', { timeout: 20_000 })
}

export async function fillParticipantName(page: Page, name: string) {
    await page.fill('input[placeholder="Name"]', name)
}

export async function fillPin(page: Page, pin: string) {
    await page.fill('input[placeholder="PIN"]', pin)
}

export async function clickContinue(page: Page) {
    await page.click('button:has-text("Continue")')
}

export async function clickJoinNow(page: Page) {
    await page.click('button:has-text("Join Now")')
}

export async function clickCancelDeviceSelection(page: Page) {
    await page.click('button:has-text("Cancel")')
}

// ── Full join flow ────────────────────────────────────────────────────────────

export async function joinRoom(page: Page, opts?: {
    roomName?: string
    participantName?: string
}) {
    const roomName = opts?.roomName ?? TEST_ROOM
    const name     = opts?.participantName ?? 'Dr. E2E Provider'

    await navigateToRoom(page, roomName)
    await waitForRoomNameScreen(page)

    // Name may be auto-filled from the current Oscar user; fill anyway
    const nameInput = page.locator('input[placeholder="Name"]')
    await nameInput.fill(name)
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
}

// ── In-room actions ───────────────────────────────────────────────────────────

export async function waitForRoom(page: Page) {
    await page.waitForSelector('footer', { timeout: 20_000 })
}

// ── Mock room control (via window.__mockRoom__) ───────────────────────────────

export async function addMockParticipant(page: Page, identity: string): Promise<string> {
    return page.evaluate((id: string) => (window as any).__mockRoom__._addParticipant(id).sid, identity)
}

export async function removeMockParticipant(page: Page, sid: string) {
    await page.evaluate((s: string) => (window as any).__mockRoom__._removeParticipant(s), sid)
}

export async function disconnectMockRoom(page: Page) {
    await page.evaluate(() => (window as any).__mockRoom__.disconnect())
}

// ── Assertions ────────────────────────────────────────────────────────────────

export async function assertOnRoomNameScreen(page: Page) {
    await expect(page.locator('text=Your Name')).toBeVisible()
}

export async function assertOnDeviceSelectionScreen(page: Page) {
    await expect(page.locator('text=Media Devices')).toBeVisible()
}

export async function assertInRoom(page: Page) {
    await expect(page.locator('footer')).toBeVisible()
}

export async function assertParticipantVisible(page: Page, identity: string) {
    await expect(page.locator(`text=${identity}`)).toBeVisible()
}

export async function assertErrorScreen(page: Page) {
    await expect(
        page.locator('text=room').or(page.locator('text=Room')).or(page.locator('text=Invalid'))
    ).toBeVisible()
}
