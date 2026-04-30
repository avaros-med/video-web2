/**
 * sse-events.spec.ts — SSE event stream: message, attachment, block chat events
 */
import { test, expect, TEST_ROOM, API_VIDEO_BASE } from './fixtures'
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

// ── SSE connection established ────────────────────────────────────────────────

test('SSE endpoint is requested when joining a room', async ({ mockedPage: page }) => {
    const sseRequest = page.waitForRequest(req =>
        req.url().includes('/sse/') || req.url().includes('/sse?'),
        { timeout: 20_000 }
    )

    await enterRoom(page)
    const req = await sseRequest
    expect(req.url()).toContain('roomName')
})

// ── Message event ─────────────────────────────────────────────────────────────

test('SSE Message event is handled by the socket service', async ({ mockedPage: page }) => {
    // Serve a controlled SSE stream with one message event
    let sseController: any = null
    await page.route(`**${API_VIDEO_BASE}/sse/**`, async route => {
        // We can't keep the connection open in route.fulfill, so serve a
        // single event then close. The app should handle this gracefully.
        await route.fulfill({
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
            body: [
                'data: {"service":"video","type":"Message","payload":{"sender":"Jane Patient","content":"Hello!","timestamp":"2026-01-01T10:00:00Z"},"eventID":"evt-001"}',
                '',
                '',
            ].join('\n'),
        })
    })

    await enterRoom(page)
    // Give a moment for the SSE data to be processed
    await page.waitForTimeout(1_000)
    // The app should not crash when receiving a message event
    await expect(page.locator('footer')).toBeVisible()
})

// ── Block chat event ──────────────────────────────────────────────────────────

test('SSE BlockChat event is processed without crashing', async ({ mockedPage: page }) => {
    await page.route(`**${API_VIDEO_BASE}/sse/**`, route =>
        route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
            body: [
                'data: {"service":"video","type":"BlockChat","payload":{"blocked":true},"eventID":"evt-002"}',
                '',
                '',
            ].join('\n'),
        })
    )

    await enterRoom(page)
    await page.waitForTimeout(500)
    await expect(page.locator('footer')).toBeVisible()
})

// ── SendAttachmentRequest event ───────────────────────────────────────────────

test('SSE SendAttachmentRequest event is processed without crashing', async ({ mockedPage: page }) => {
    await page.route(`**${API_VIDEO_BASE}/sse/**`, route =>
        route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
            body: [
                'data: {"service":"video","type":"SendAttachmentRequest","payload":{"filename":"test.pdf","requestId":"req-001"},"eventID":"evt-003"}',
                '',
                '',
            ].join('\n'),
        })
    )

    await enterRoom(page)
    await page.waitForTimeout(500)
    await expect(page.locator('footer')).toBeVisible()
})

// ── SSE reconnect ─────────────────────────────────────────────────────────────

test('app remains functional if SSE stream closes immediately', async ({ mockedPage: page }) => {
    // Return an empty stream (connection closes right away)
    await page.route(`**${API_VIDEO_BASE}/sse/**`, route =>
        route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
            body: '',
        })
    )

    await enterRoom(page)
    await page.waitForTimeout(500)
    // App should still be in the room
    await expect(page.locator('footer')).toBeVisible()
})
