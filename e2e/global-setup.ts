/**
 * Playwright global setup for video-web2 E2E tests.
 *
 * 1. Logs in to Oscar EMR (localhost:8080) as the test physician and saves the
 *    JSESSIONID + CLIENT_ID cookies to /tmp/video-e2e-auth.json so the
 *    mockedPage fixture can inject them into each test's browser context.
 *
 * 2. Cleans up test video appointments left over from a previous aborted run.
 *
 * Prerequisites:
 *   - MySQL at localhost:3306 (user: avaros, pw: avaros, db: emr)
 *   - Schedule service at localhost:8810
 *   - Oscar EMR at localhost:8080
 */

import mysql from 'mysql2/promise'
import fetch from 'node-fetch'
import * as fs from 'fs'

export const AUTH_COOKIE_FILE = '/tmp/video-e2e-auth.json'
export const OSCAR_CLIENT_ID = 'emr'

const DB: mysql.ConnectionOptions = {
    host: '127.0.0.1',
    port: 3306,
    user: 'avaros',
    password: 'avaros',
    database: 'emr',
}

// The test room name used by all video E2E tests.
// Must match TEST_ROOM in fixtures.ts.
const TEST_ROOM_PREFIX = 'e2e-'
const TEST_ROOM = 'e2e-test-room'
const TEST_ROOM_PIN = 'e2e-pin-room'
const TEST_PROVIDER_ID = 880001

async function getOscarJsession(): Promise<string> {
    const res = await fetch('http://localhost:8080/oscar/login.do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=avaros&password=avaros&pin=5623',
        redirect: 'manual',
    })

    const setCookies = res.headers.raw()['set-cookie'] || []
    for (const c of setCookies) {
        const m = c.match(/JSESSIONID=([^;]+)/)
        if (m) return m[1]
    }

    // Follow the redirect chain to find a JSESSIONID that survives login
    const location = res.headers.get('location') || ''
    if (location.includes('login=failed') || !location) {
        throw new Error(`Oscar login failed — location: ${location || '(none)'}`)
    }

    throw new Error('Oscar login: no JSESSIONID cookie found in response')
}

export default async function globalSetup() {
    // ── 1. Oscar login ───────────────────────────────────────────────────────
    const jsessionid = await getOscarJsession()
    fs.writeFileSync(
        AUTH_COOKIE_FILE,
        JSON.stringify({ jsessionid, clientId: OSCAR_CLIENT_ID }),
        'utf8'
    )
    console.log(`[video global-setup] Oscar login OK — JSESSIONID saved to ${AUTH_COOKIE_FILE}`)

    // ── 2. DB setup ──────────────────────────────────────────────────────────
    const conn = await mysql.createConnection(DB)
    try {
        // Clean up stale E2E appointments
        const [delResult] = await conn.execute<mysql.ResultSetHeader>(
            `DELETE FROM appointment
             WHERE notes LIKE ?
                OR notes LIKE 'E2E:%'`,
            [`%${TEST_ROOM_PREFIX}%`]
        )
        if (delResult.affectedRows > 0) {
            console.log(`[video global-setup] Deleted ${delResult.affectedRows} stale E2E video appointment(s)`)
        }

        // Ensure the base test room exists (no PIN)
        await conn.execute(
            `INSERT INTO video_room (name, provider_id, pin)
             VALUES (?, ?, NULL)
             ON DUPLICATE KEY UPDATE provider_id=?, pin=NULL`,
            [TEST_ROOM, TEST_PROVIDER_ID, TEST_PROVIDER_ID]
        )
        console.log(`[video global-setup] Ensured video_room '${TEST_ROOM}' exists`)

        // Ensure a PIN-protected room exists (used by pin-flow tests)
        await conn.execute(
            `INSERT INTO video_room (name, provider_id, pin)
             VALUES (?, ?, '1234')
             ON DUPLICATE KEY UPDATE provider_id=?, pin='1234'`,
            [TEST_ROOM_PIN, TEST_PROVIDER_ID, TEST_PROVIDER_ID]
        )
        console.log(`[video global-setup] Ensured video_room '${TEST_ROOM_PIN}' exists (PIN=1234)`)
    } finally {
        await conn.end()
    }
}
