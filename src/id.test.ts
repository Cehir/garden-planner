import { describe, expect, it } from 'vitest'
import { uid } from './id'

describe('uid', () => {
  it('verwendet das übergebene Präfix', () => {
    expect(uid('bed')).toMatch(/^bed-/)
    expect(uid()).toMatch(/^id-/)
  })

  it('liefert bei aufeinanderfolgenden Aufrufen unterschiedliche IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()))
    expect(ids.size).toBe(100)
  })
})
