/**
 * The room page's steps, as a person takes them: open the link, type a name (and the
 * PIN), continue, join; and what the mock room lets a test do in the call.
 */
import { expect, Page } from '@playwright/test'

import { roomPageUrl } from './support/settings'

export async function openRoom(page: Page, roomName: string) {
    // The mock room takes the room's name (fixtures.ts)
    await page.addInitScript(`window.__E2E_ROOM_NAME__ = ${JSON.stringify(roomName)};`)
    await page.goto(roomPageUrl(roomName))
}

export async function waitForRoomNameScreen(page: Page) {
    await expect(page.getByText('Your Name')).toBeVisible({ timeout: 20_000 })
}

export async function waitForDeviceSelectionScreen(page: Page) {
    await expect(page.getByText('Media Devices')).toBeVisible({ timeout: 20_000 })
}

export async function fillParticipantName(page: Page, name: string) {
    await page.fill('input[placeholder="Name"]', name)
}

export async function fillPin(page: Page, pin: string) {
    // A masked field: typed key by key, as a person would (fill() over a full mask
    // leaves the old digits in place)
    const field = page.locator('input[placeholder="PIN"]')
    await field.click()
    await field.press('ControlOrMeta+A')
    await field.press('Backspace')
    await field.pressSequentially(pin)
    await expect(field).toHaveValue(pin)
    // The page checks the PIN with ehr when the field loses focus
    await field.blur()
}

export async function clickContinue(page: Page) {
    await page.click('button:has-text("Continue")')
}

export async function clickJoinNow(page: Page) {
    await page.click('button:has-text("Join Now")')
}

export async function waitForRoom(page: Page) {
    await expect(page.locator('footer')).toBeVisible({ timeout: 20_000 })
}

/** From the link to the call. The provider's name is filled in from their JWT. */
export async function joinRoom(page: Page, roomName: string, opts: { name?: string; pin?: string } = {}) {
    await openRoom(page, roomName)
    await waitForRoomNameScreen(page)
    if (opts.pin) await fillPin(page, opts.pin)
    if (opts.name) await fillParticipantName(page, opts.name)
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
    await clickJoinNow(page)
    await waitForRoom(page)
}

export async function addMockParticipant(page: Page, identity: string): Promise<string> {
    return page.evaluate((id: string) => (window as any).__mockRoom__._addParticipant(id).sid, identity)
}

export async function removeMockParticipant(page: Page, sid: string) {
    await page.evaluate((s: string) => (window as any).__mockRoom__._removeParticipant(s), sid)
}

/** Opens the chat (the Messages panel). */
export async function openChat(page: Page) {
    await page.locator('footer i.material-icons').filter({ hasText: /^chat/ }).first().click()
    await expect(page.getByPlaceholder('Type a message ...')).toBeVisible()
}

export async function sendChatMessage(page: Page, message: string) {
    await page.getByPlaceholder('Type a message ...').fill(message)
    await page.click('button:has-text("Send")')
}

export async function assertErrorScreen(page: Page) {
    await expect(page.getByText('Whoops!', { exact: true })).toBeVisible({ timeout: 20_000 })
}
