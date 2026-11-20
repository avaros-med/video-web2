/**
 * In the call: the chat and the files, between the provider's page and the patient's,
 * through ehr's room stream.
 */
import path from 'path'
import fs from 'fs'
import os from 'os'

import { expect, test } from './fixtures'
import { joinRoom, openChat, sendChatMessage } from './helpers'

test('a line sent by one reaches the other, under the name they joined with', async ({ patientPage, providerPage, visit }) => {
    await joinRoom(providerPage, visit.roomName)
    await joinRoom(patientPage, visit.roomName, { name: 'Jane Patient' })
    await openChat(providerPage)
    await openChat(patientPage)

    await sendChatMessage(patientPage, 'Can you hear me?')

    await expect(providerPage.getByText('Can you hear me?')).toBeVisible()
    await expect(providerPage.getByText('Jane Patient', { exact: true })).toBeVisible()
    await expect(patientPage.getByText('Can you hear me?')).toBeVisible()
    await expect(patientPage.getByPlaceholder('Type a message ...')).toHaveValue('')
})

test('a file the patient sends, the provider downloads once', async ({ patientPage, providerPage, visit }) => {
    await joinRoom(providerPage, visit.roomName)
    await joinRoom(patientPage, visit.roomName, { name: 'Jane Patient' })
    await openChat(providerPage)
    await openChat(patientPage)

    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'video-e2e-')), 'rash.pdf')
    fs.writeFileSync(file, '%PDF-1.4 test')
    // Our attach button's input (the Twilio chat window has one of its own, unused)
    await patientPage.locator('input[type="file"][accept^="image/png"]').setInputFiles(file)

    await expect(patientPage.getByText('rash.pdf')).toBeVisible()
    await expect(patientPage.getByText('Sent', { exact: true })).toBeVisible()
    await expect(providerPage.getByText('rash.pdf')).toBeVisible()

    const download = providerPage.waitForEvent('download')
    await providerPage.click('button:has-text("Download")')
    expect((await download).suggestedFilename()).toBe('rash.pdf')
    await expect(providerPage.getByText('Downloaded')).toBeVisible()
})

test('the provider turns the chat off for everyone in the room', async ({ patientPage, providerPage, visit }) => {
    await joinRoom(providerPage, visit.roomName)
    await joinRoom(patientPage, visit.roomName, { name: 'Jane Patient' })
    await openChat(patientPage)

    await providerPage.locator('footer i.material-icons').filter({ hasText: /^settings$/ }).first().click()
    await providerPage.getByText('Disable Chat').click()
    await providerPage.getByRole('button', { name: 'Disable', exact: true }).click()

    await expect(patientPage.getByText('Chat is disabled for this video visit')).toBeVisible()
})
