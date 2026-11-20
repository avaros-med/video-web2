import axios from 'axios'
import { videoService } from './video.service'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

const ROOM = 'braamc_999998-abc'
const EHR = 'http://localhost:3000'

const ROOM_ANSWER = {
    room: { name: ROOM, locked: true },
    visit: {
        startAt: '2026-10-13T09:00:00-04:00',
        endAt: '2026-10-13T09:15:00-04:00',
        type: { name: 'Follow-up', color: '#00ff00' },
        provider: { firstName: 'Doctor', lastName: 'Oscardoc', title: 'Dr.' },
    },
    signedInProvider: {
        providerNo: '999998',
        firstName: 'Doctor',
        lastName: 'Oscardoc',
    },
    patient: { demographicNo: 1001, firstName: 'Jane', lastName: 'Patient' },
}

describe('the room page on ehr', () => {
    beforeEach(() => {
        jest.resetAllMocks()
        document.cookie = 'JWT=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    })

    it("reads the room, the provider's name and the visit's patient", async () => {
        mockAxios.get.mockResolvedValue({ data: ROOM_ANSWER })

        const room = await videoService.getRoom(ROOM)

        expect(mockAxios.get).toHaveBeenCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}`,
            {
                headers: {},
            }
        )
        expect(room).toMatchObject({
            name: ROOM,
            isLocked: true,
            typeName: 'Follow-up',
            typeColor: '#00ff00',
            signedInProvider: {
                providerNo: '999998',
                firstName: 'Doctor',
                lastName: 'Oscardoc',
            },
            patient: {
                demographicNo: 1001,
                firstName: 'Jane',
                lastName: 'Patient',
            },
        })
        expect(room.startAt.toISOString()).toBe('2026-10-13T13:00:00.000Z')
        expect(room.endAt.toISOString()).toBe('2026-10-13T13:15:00.000Z')
    })

    it("sends the provider's JWT when the browser has one", async () => {
        document.cookie = 'JWT="a.b.c"'
        mockAxios.post.mockResolvedValue({
            data: {
                token: 't',
                identity: 'Doctor Oscardoc_123456',
                provider: true,
            },
        })

        const token = await videoService.getToken(ROOM, 'Doctor Oscardoc')

        expect(mockAxios.post).toHaveBeenCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}/token`,
            { identity: 'Doctor Oscardoc' },
            { headers: { Authorization: 'Bearer a.b.c' } }
        )
        expect(token).toEqual({
            token: 't',
            identity: 'Doctor Oscardoc_123456',
            provider: true,
        })
    })

    it('checks a PIN, sends a chat line and turns the chat off', async () => {
        mockAxios.post.mockResolvedValueOnce({ data: { valid: false } })
        expect(await videoService.checkPin(ROOM, '123456')).toBe(false)
        expect(mockAxios.post).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}/pin`,
            { pin: '123456' },
            { headers: {} }
        )

        mockAxios.post.mockResolvedValueOnce({ data: { id: 'line-1' } })
        expect(
            await videoService.sendMessage(ROOM, 'Hello', 'Jane_123456')
        ).toEqual({ id: 'line-1' })
        expect(mockAxios.post).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}/messages`,
            { message: 'Hello', senderName: 'Jane_123456' },
            { headers: {} }
        )

        mockAxios.post.mockResolvedValueOnce({ data: {} })
        await videoService.turnChatOff(ROOM)
        expect(mockAxios.post).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}/chat-off`,
            {},
            { headers: {} }
        )
    })

    it('offers a file as multipart form data, and downloads one once', async () => {
        mockAxios.post.mockResolvedValueOnce({
            data: { id: 'f-1', name: 'rash.png' },
        })
        const file = new File(['x'], 'rash.png', { type: 'image/png' })

        expect(
            await videoService.offerFile(ROOM, file, 'Jane_123456')
        ).toEqual({ id: 'f-1', name: 'rash.png' })
        const [url, form] = mockAxios.post.mock.calls[0]
        expect(url).toBe(`${EHR}/api/v1/video/rooms/${ROOM}/files`)
        expect((form as FormData).get('senderName')).toBe('Jane_123456')
        expect(((form as FormData).get('file') as File).name).toBe('rash.png')

        mockAxios.get.mockResolvedValueOnce({ data: new Blob(['x']) })
        await videoService.downloadFile(ROOM, 'f-1')
        expect(mockAxios.get).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}/files/f-1`,
            {
                headers: {},
                responseType: 'blob',
            }
        )
    })

    it('opens a chart document with the date of birth: the file, a wrong date, or gone', async () => {
        const blob = new Blob(['%PDF'])
        mockAxios.post.mockResolvedValueOnce({ data: blob })
        expect(
            await videoService.openDocument(ROOM, 'd-1', '1982-06-15')
        ).toEqual({ blob })
        expect(mockAxios.post).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}/documents/d-1/open`,
            { birthDate: '1982-06-15' },
            { headers: {}, responseType: 'blob' }
        )

        mockAxios.post.mockRejectedValueOnce({ response: { status: 403 } })
        expect(await videoService.openDocument(ROOM, 'd-1', '1982-06-16')).toBe(
            'wrong_birth_date'
        )

        mockAxios.post.mockRejectedValueOnce({ response: { status: 404 } })
        expect(await videoService.openDocument(ROOM, 'd-1', '1982-06-15')).toBe(
            'gone'
        )

        mockAxios.post.mockRejectedValueOnce({ response: { status: 500 } })
        await expect(
            videoService.openDocument(ROOM, 'd-1', '1982-06-15')
        ).rejects.toEqual({ response: { status: 500 } })
    })

    it('offers a chart document with its item, and fetches its PDF from the EMR with the session', async () => {
        mockAxios.get.mockResolvedValueOnce({ data: new Blob(['%PDF']) })
        const pdf = await videoService.downloadChartItem({
            id: 12,
            type: 'document',
            title: 'ECG',
            createdAt: '2026-10-01',
            downloadPath: '/oscar/dms/PrintDocument.do?docId=12',
        })
        expect(mockAxios.get).toHaveBeenLastCalledWith(
            '/oscar/dms/PrintDocument.do?docId=12',
            {
                responseType: 'blob',
                withCredentials: true,
            }
        )

        mockAxios.post.mockResolvedValueOnce({
            data: { id: 'd-1', name: 'ECG.pdf' },
        })
        await videoService.offerDocument(
            ROOM,
            pdf,
            { type: 'document', id: 12 },
            'Doctor Oscardoc_123456'
        )
        const [url, form] = mockAxios.post.mock.calls[0]
        expect(url).toBe(`${EHR}/api/v1/video/rooms/${ROOM}/documents`)
        expect([
            (form as FormData).get('type'),
            (form as FormData).get('itemId'),
        ]).toEqual(['document', '12'])
    })

    it('logs a visit with when this person started, and removes a participant', async () => {
        mockAxios.post.mockResolvedValue({ data: {} })

        await videoService.logVisit(
            ROOM,
            new Date('2026-10-13T13:02:00Z'),
            'Comments: none'
        )
        expect(mockAxios.post).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}/visits`,
            {
                startedAt: '2026-10-13T13:02:00.000Z',
                eventDetails: 'Comments: none',
            },
            { headers: {} }
        )

        await videoService.removeParticipant(ROOM, 'PA123')
        expect(mockAxios.post).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/rooms/${ROOM}/participants/PA123/disconnect`,
            {},
            { headers: {} }
        )
    })

    it("the side panel: the search, the chart items and the note, on the room's clinic's ehr", async () => {
        mockAxios.get.mockResolvedValueOnce({
            data: {
                patients: [
                    {
                        demographicNo: 1001,
                        firstName: 'Jane',
                        lastName: 'Patient',
                        dateOfBirth: '1982-06-15',
                        sex: 'F',
                    },
                ],
            },
        })
        expect(await videoService.searchPatients(ROOM, 'Jane')).toEqual([
            {
                demographicNo: 1001,
                firstName: 'Jane',
                lastName: 'Patient',
                dateOfBirth: '1982-06-15',
                sex: 'F',
            },
        ])
        expect(mockAxios.get).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/patients`,
            {
                headers: {},
                params: { search: 'Jane' },
            }
        )

        mockAxios.get.mockResolvedValueOnce({
            data: {
                documents: [
                    {
                        id: 7,
                        type: 'eform',
                        title: 'Rourke',
                        createdAt: '2026-10-02',
                        downloadPath: '/oscar/x',
                    },
                ],
            },
        })
        expect(await videoService.getChartItems(ROOM, 1001)).toEqual([
            {
                id: 7,
                type: 'eform',
                title: 'Rourke',
                createdAt: '2026-10-02',
                downloadPath: '/oscar/x',
            },
        ])
        expect(
            mockAxios.get
        ).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/patients/1001/documents`,
            { headers: {} }
        )

        mockAxios.post.mockResolvedValueOnce({ data: { noteId: 5 } })
        await videoService.addNote(ROOM, 1001, 'Seen by video.')
        expect(mockAxios.post).toHaveBeenLastCalledWith(
            `${EHR}/api/v1/video/patients/1001/notes`,
            { note: 'Seen by video.' },
            { headers: {} }
        )
    })
})
