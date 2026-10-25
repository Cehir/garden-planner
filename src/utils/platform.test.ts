import { describe, expect, it } from 'vitest'
import { detectMac } from './platform'

const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

describe('detectMac', () => {
  it('erkennt einen Mac-User-Agent', () => {
    expect(detectMac({ userAgent: MAC_UA })).toBe(true)
  })

  it('erkennt einen Nicht-Mac-User-Agent', () => {
    expect(detectMac({ userAgent: WIN_UA })).toBe(false)
  })

  it('bevorzugt userAgentData.platform (Chromium meldet „macOS“)', () => {
    expect(detectMac({ userAgent: 'Mozilla/5.0', userAgentData: { platform: 'macOS' } })).toBe(true)
    expect(detectMac({ userAgent: 'Mozilla/5.0', userAgentData: { platform: 'Windows' } })).toBe(false)
  })

  it('fällt bei leerem userAgentData.platform auf den User-Agent zurück', () => {
    expect(detectMac({ userAgent: MAC_UA, userAgentData: { platform: '' } })).toBe(true)
  })

  it('liefert false ohne navigator (SSR)', () => {
    expect(detectMac(undefined)).toBe(false)
  })
})
