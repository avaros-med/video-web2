import {
    clinicOfRoom,
    EHR_LOCAL_URL,
    ehrToken,
    EhrUrlError,
    resolveEhrUrl,
} from './ehr'

const ROOM = 'braamc_999998-3f1c2d4e-0000-4000-8000-000000000000'

describe('clinicOfRoom', () => {
    it('is the part of an ehr room name before the first underscore', () => {
        expect(clinicOfRoom(ROOM)).toBe('braamc')
        expect(clinicOfRoom('BraamC_1-x')).toBe('braamc')
    })

    it('is null for a room ark made, which has no clinic in its name', () => {
        expect(clinicOfRoom('999998-3f1c2d4e')).toBeNull()
        expect(clinicOfRoom('')).toBeNull()
        expect(clinicOfRoom(undefined)).toBeNull()
    })

    it('refuses anything that is not one host label', () => {
        for (const name of [
            'evil.com_1-x',
            'a/b_1-x',
            '_1-x',
            '-braamc_1-x',
            'user@host_1-x',
        ]) {
            expect(clinicOfRoom(name)).toBeNull()
        }
    })
})

describe('resolveEhrUrl', () => {
    const at = (
        hostname: string,
        extra: Partial<Parameters<typeof resolveEhrUrl>[0]> = {}
    ) =>
        resolveEhrUrl({
            roomName: ROOM,
            hostname,
            isProduction: true,
            ...extra,
        })

    it("is the room's clinic's subdomain of the page's domain", () => {
        expect(at('app.avaros.ca')).toBe('https://braamc.avaros.ca')
        expect(at('test.avaros.ca')).toBe('https://braamc.test.avaros.ca')
    })

    it('is the local ehr when the page runs locally', () => {
        expect(at('localhost')).toBe(EHR_LOCAL_URL)
    })

    it('takes REACT_APP_EHR_URL whole outside a production build', () => {
        expect(
            at('localhost', {
                override: 'https://braamc.test.avaros.ca/',
                isProduction: false,
            })
        ).toBe('https://braamc.test.avaros.ca')
        expect(at('app.avaros.ca', { override: 'http://elsewhere' })).toBe(
            'https://braamc.avaros.ca'
        )
    })

    it('refuses a room with no clinic, and a host it does not know', () => {
        expect(() =>
            resolveEhrUrl({
                roomName: '999998-x',
                hostname: 'app.avaros.ca',
                isProduction: true,
            })
        ).toThrow(EhrUrlError)
        expect(() => at('example.com')).toThrow(EhrUrlError)
    })
})

describe('ehrToken', () => {
    afterEach(() => {
        document.cookie = 'JWT=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    })

    it('is the JWT cookie OSCAR set, without its quotes', () => {
        document.cookie = 'JWT="abc.def.ghi"'
        expect(ehrToken()).toBe('abc.def.ghi')
    })

    it("is undefined without one: the page is the patient's", () => {
        expect(ehrToken()).toBeUndefined()
    })
})
