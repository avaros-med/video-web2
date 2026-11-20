/**
 * Before the call: the room ehr answers for the link (its visit's time and provider),
 * links that name no visit, and a locked room's PIN.
 */
import { expect, test } from './fixtures'
import {
    assertErrorScreen,
    clickContinue,
    fillParticipantName,
    fillPin,
    openRoom,
    waitForDeviceSelectionScreen,
    waitForRoomNameScreen,
} from './helpers'
import { tokenClaims } from './support/ehr'

test('the link shows the visit and its provider, and asks the patient for a name', async ({ patientPage: page, visit }) => {
    await openRoom(page, visit.roomName)
    await waitForRoomNameScreen(page)

    const claims = tokenClaims()
    await expect(page.getByText(String(claims.lastName), { exact: false }).first()).toBeVisible()
    await expect(page.locator('input[placeholder="Name"]')).toHaveValue('')
    await expect(page.locator('input[placeholder="PIN"]')).toHaveCount(0)
    await expect(page.locator('button:has-text("Continue")')).toBeDisabled()

    await fillParticipantName(page, 'Jane Patient')
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
})

test("the provider's name is filled in from their JWT", async ({ providerPage: page, visit }) => {
    await openRoom(page, visit.roomName)
    await waitForRoomNameScreen(page)

    const claims = tokenClaims()
    await expect(page.locator('input[placeholder="Name"]')).toHaveValue(`${claims.firstName} ${claims.lastName}`.trim())
})

test('a link to a room ehr does not have shows the error screen', async ({ patientPage: page, visit }) => {
    const clinic = visit.roomName.split('_')[0]
    await openRoom(page, `${clinic}_999998-00000000-0000-4000-8000-000000000000`)
    await assertErrorScreen(page)
    await expect(page.getByText('This video visit link is not valid')).toBeVisible()
})

test("a room ark made (no clinic in its name) is not this page's", async ({ patientPage: page }) => {
    await openRoom(page, '999998-00000000-0000-4000-8000-000000000000')
    await assertErrorScreen(page)
})

test('a locked room asks for its PIN, refuses a wrong one and takes the right one', async ({ patientPage: page, ehr, visit }) => {
    const pin = await ehr.lock(visit)

    await openRoom(page, visit.roomName)
    await waitForRoomNameScreen(page)
    await fillParticipantName(page, 'Jane Patient')

    await fillPin(page, pin === '000000' ? '111111' : '000000')
    await clickContinue(page)
    await expect(page.getByText('Invalid PIN')).toBeVisible()

    await fillPin(page, pin)
    await expect(page.getByText('Invalid PIN')).toHaveCount(0)
    await clickContinue(page)
    await waitForDeviceSelectionScreen(page)
})
