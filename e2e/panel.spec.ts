/**
 * The provider's side panel: it opens on the visit's patient, files a note on their
 * eChart, and lists their chart for sending. The patient's page has none of it.
 */
import { expect, test } from './fixtures'
import { joinRoom, openChat } from './helpers'
import { settings, testPatientNumber } from './support/settings'

test("the panel opens on the visit's patient and files a note on their eChart", async ({ providerPage: page, visit }) => {
    await joinRoom(page, visit.roomName)

    await page.click('button:has-text("eChart")')
    await expect(page.getByText('Patient', { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder('Enter Note')).toBeVisible()

    const filed = page.waitForResponse(
        response => response.url() === `${settings.ehrUrl}/api/v1/video/patients/${testPatientNumber()}/notes`
    )
    await page.getByPlaceholder('Enter Note').fill('Seen by video. [e2e]')
    await page.click('button:has-text("Add Note to eChart")')

    const response = await filed
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ noteId: expect.any(Number) })
    await expect(page.getByText('Successfully added note')).toBeVisible()
})

test("the provider's attach button lists the patient's chart", async ({ providerPage: page, visit }) => {
    await joinRoom(page, visit.roomName)
    await openChat(page)
    const listed = page.waitForResponse(response => response.url().endsWith(`/patients/${testPatientNumber()}/documents`))

    await page.locator('i.material-icons').filter({ hasText: 'attachment' }).first().click()

    expect((await listed).status()).toBe(200)
    await expect(page.getByText('Patient Documents')).toBeVisible()
})

test("the patient's page has no eChart", async ({ patientPage: page, visit }) => {
    await joinRoom(page, visit.roomName, { name: 'Jane Patient' })
    await expect(page.locator('button:has-text("eChart")')).toHaveCount(0)
})
