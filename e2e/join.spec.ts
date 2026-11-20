/**
 * Joining: the token from ehr for the name typed, the call, the others in it, and the
 * visit log row ehr writes when a call ends.
 */
import { expect, test } from './fixtures'
import { addMockParticipant, joinRoom, removeMockParticipant } from './helpers'
import { settings } from './support/settings'

test("joining asks ehr for the room's token, for the name typed", async ({ patientPage: page, visit }) => {
    const tokenRequest = page.waitForRequest(
        request => request.url() === `${settings.ehrUrl}/api/v1/video/rooms/${visit.roomName}/token` && request.method() === 'POST'
    )

    await joinRoom(page, visit.roomName, { name: 'Jane Patient' })

    expect((await tokenRequest).postDataJSON()).toEqual({ identity: 'Jane Patient' })
    await expect(page.locator('footer i.material-icons').filter({ hasText: 'call_end' })).toBeVisible()
})

test('others joining and leaving the call are shown', async ({ patientPage: page, visit }) => {
    await joinRoom(page, visit.roomName, { name: 'Jane Patient' })

    const sid = await addMockParticipant(page, 'Doctor Oscardoc_123456')
    await expect(page.getByText('Doctor Oscardoc_123456').first()).toBeVisible()

    await removeMockParticipant(page, sid)
    await expect(page.getByText('Doctor Oscardoc_123456')).toHaveCount(0)
})

test("the patient's end of the call is logged by ehr", async ({ patientPage: page, ehr, visit }) => {
    await joinRoom(page, visit.roomName, { name: 'Jane Patient' })
    const logged = page.waitForResponse(response => response.url().endsWith(`/rooms/${visit.roomName}/visits`))

    await page.locator('footer i.material-icons').filter({ hasText: 'call_end' }).click()

    expect((await logged).status()).toBe(204)
    await expect(page.locator('footer')).toHaveCount(0)
    const row = (await ehr.visitLogs())[0]
    expect(row.physicianFlag).toBe('Other')
    expect(row.eventDetails).toContain('Start at:')
})

test('the provider says how the call went, and their row says so', async ({ providerPage: page, ehr, visit }) => {
    await joinRoom(page, visit.roomName)

    await page.locator('footer i.material-icons').filter({ hasText: 'call_end' }).click()
    await expect(page.getByText('Ending Call')).toBeVisible()
    await page.locator('[role="dialog"] textarea').first().fill('Rash improving')
    await page.click('button:has-text("End call")')

    await expect(page.locator('footer')).toHaveCount(0)
    await expect
        .poll(async () => (await ehr.visitLogs())[0]?.eventDetails ?? '')
        .toContain('Comments: Rash improving')
    expect((await ehr.visitLogs())[0].physicianFlag).toBe('Doctor')
})
