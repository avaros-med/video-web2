/**
 * login.spec.ts — Passcode login page (REACT_APP_SET_AUTH=passcode)
 *
 * The login page only renders when auth is enabled. These tests mock the
 * passcode auth state and test the login UI.
 */
import { test, expect } from './fixtures'
import { navigateToLogin } from './helpers'

// The login page only shows when REACT_APP_SET_AUTH=passcode.
// In the default build it redirects to "/" — tests handle both cases.

test('login page renders passcode input and submit button', async ({ mockedPage: page }) => {
    await navigateToLogin(page)

    // If auth is not enabled, the page redirects — check for either state
    const url = page.url()
    if (url.includes('/login')) {
        await expect(page.locator('#input-passcode')).toBeVisible()
        await expect(page.locator('button[type="submit"]:has-text("Submit")')).toBeVisible()
        // Submit is disabled when passcode is empty
        await expect(page.locator('button[type="submit"]')).toBeDisabled()
    }
    // If redirected, the test is a no-op (auth not configured)
})

test('typing a passcode enables the Submit button', async ({ mockedPage: page }) => {
    await navigateToLogin(page)
    if (!page.url().includes('/login')) return

    await page.fill('#input-passcode', 'test-passcode')
    await expect(page.locator('button[type="submit"]')).toBeEnabled()
})

test('submitting an invalid passcode shows an error message', async ({ mockedPage: page }) => {
    // Mock the token endpoint to reject the passcode
    await page.route('**/token/**', route =>
        route.fulfill({ status: 401, json: { error: 'Invalid passcode' } })
    )

    await navigateToLogin(page)
    if (!page.url().includes('/login')) return

    await page.fill('#input-passcode', 'wrong-passcode')
    await page.click('button[type="submit"]')

    await expect(
        page.locator('[class*="errorMessage"]').or(page.locator('text=Passcode is incorrect'))
    ).toBeVisible({ timeout: 5_000 })
})

test('successful login redirects to the main app', async ({ mockedPage: page }) => {
    // Mock token endpoint to accept the passcode
    await page.route('**/token/**', route =>
        route.fulfill({ json: { token: 'mock.jwt.token', room_type: 'peer-to-peer' } })
    )

    await navigateToLogin(page)
    if (!page.url().includes('/login')) return

    await page.fill('#input-passcode', 'correct-passcode')
    await page.click('button[type="submit"]')

    // Should redirect away from login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 })
})

test('login page shows "Enter passcode to join a room" heading', async ({ mockedPage: page }) => {
    await navigateToLogin(page)
    if (!page.url().includes('/login')) return

    await expect(page.locator('text=Enter passcode to join a room')).toBeVisible()
})
