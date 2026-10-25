import { describe, expect, it } from 'vitest'
import { exportFileName, parseImport } from './useImportExport'
import { createDefaultState } from '../persistence'

describe('parseImport', () => {
  it('liest einen exportierten Plan wieder ein', () => {
    const state = createDefaultState()
    state.garden.name = 'Hinterhof'
    state.beds = [{ id: 'b1', name: 'Beet', x: 0, y: 0, w: 100, h: 100, color: '#7fb069', notes: '' }]
    const out = parseImport(JSON.stringify(state))
    expect(out).toEqual(state)
  })

  it('ergänzt fehlende Sammlungen mit Standardwerten', () => {
    const out = parseImport(JSON.stringify({ garden: { name: 'G', width: 100, height: 100 }, beds: [] }))
    expect(out?.seeds).toEqual([])
    expect(out?.diary).toEqual([])
    expect(out?.plants).toEqual(createDefaultState().plants)
  })

  it('lehnt ungültiges JSON ab', () => {
    expect(parseImport('{kein json')).toBeNull()
  })

  it('lehnt JSON ohne Garten oder Beet-Liste ab', () => {
    expect(parseImport('null')).toBeNull()
    expect(parseImport('{}')).toBeNull()
    expect(parseImport(JSON.stringify({ garden: { name: 'G' }, beds: {} }))).toBeNull()
  })
})

describe('exportFileName', () => {
  it('leitet den Dateinamen aus dem Gartennamen ab', () => {
    expect(exportFileName('Mein  Garten')).toBe('mein-garten.json')
  })

  it('nutzt einen Standardnamen bei leerem Gartennamen', () => {
    expect(exportFileName('')).toBe('gartenplan.json')
  })
})
