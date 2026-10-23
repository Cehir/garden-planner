import { describe, expect, it } from 'vitest'
import { createDefaultState } from './persistence'
import { historyReducer, MAX_HISTORY } from './history'
import type { HistoryState } from './history'
import type { Action } from './reducer'
import type { Bed } from './types'

function init(start?: HistoryState): HistoryState {
  return (
    start ?? { present: createDefaultState(), past: [], future: [], txnDepth: 0, txnBase: null }
  )
}

function mutate(hs: HistoryState, action: Action): HistoryState {
  return historyReducer(hs, { type: 'mutate', action })
}

function bed(id: string, overrides: Partial<Bed> = {}): Bed {
  return {
    id,
    name: `Beet ${id}`,
    x: 10,
    y: 20,
    w: 100,
    h: 50,
    color: '#7fb069',
    notes: '',
    ...overrides,
  }
}

describe('historyReducer – Undo/Redo', () => {
  it('legt bei jeder normalen Mutation genau einen Undo-Eintrag an', () => {
    let hs = init()
    expect(hs.past).toHaveLength(0)
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    expect(hs.past).toHaveLength(1)
  })

  it('macht eine Mutation rückgängig und stellt den Zustand wieder her', () => {
    let hs = init()
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    expect(hs.present.beds).toHaveLength(1)

    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.present.beds).toHaveLength(0)
    expect(hs.future).toHaveLength(1)

    hs = historyReducer(hs, { type: 'redo' })
    expect(hs.present.beds).toHaveLength(1)
    expect(hs.future).toHaveLength(0)
  })

  it('erlaubt mehrere Undo-Schritte in der richtigen Reihenfolge', () => {
    let hs = init()
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    hs = mutate(hs, { type: 'addBed', bed: bed('b2') })
    hs = mutate(hs, { type: 'addBed', bed: bed('b3') })
    expect(hs.present.beds.map((b) => b.id)).toEqual(['b1', 'b2', 'b3'])

    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.present.beds.map((b) => b.id)).toEqual(['b1', 'b2'])
    expect(hs.past).toHaveLength(2)
    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.present.beds.map((b) => b.id)).toEqual(['b1'])
    expect(hs.past).toHaveLength(1)
    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.present.beds).toHaveLength(0)
    expect(hs.past).toHaveLength(0)
  })

  it('tut nichts bei leerer undo-Past bzw. redo-Future', () => {
    const hs = init()
    expect(historyReducer(hs, { type: 'undo' })).toBe(hs)
    expect(historyReducer(hs, { type: 'redo' })).toBe(hs)
  })

  it('löscht die redo-Future, wenn nach einem Undo neu mutiert wird', () => {
    let hs = init()
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.future).toHaveLength(1)

    hs = mutate(hs, { type: 'addBed', bed: bed('b2') })
    expect(hs.future).toHaveLength(0)
  })
})

describe('historyReducer – Transaktionen', () => {
  it('fasst mehrere Mutationen einer Ziehgeste zu einem Schritt zusammen', () => {
    let hs = init()
    hs = historyReducer(hs, { type: 'begin' })
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    hs = mutate(hs, { type: 'updateBed', id: 'b1', patch: { x: 40, y: 50 } })
    hs = mutate(hs, { type: 'updateBed', id: 'b1', patch: { w: 120 } })
    expect(hs.past).toHaveLength(0)

    hs = historyReducer(hs, { type: 'commit' })
    expect(hs.past).toHaveLength(1)
    expect(hs.present.beds[0]).toMatchObject({ x: 40, y: 50, w: 120 })

    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.present.beds).toHaveLength(0)
  })

  it('erzeugt keinen Undo-Eintrag für eine leere Transaktion (Klick ohne Bewegung)', () => {
    let hs = init()
    hs = historyReducer(hs, { type: 'begin' })
    hs = historyReducer(hs, { type: 'commit' })
    expect(hs.past).toHaveLength(0)
  })

  it('verwirft ein commit ohne begin (kein Zustand geändert)', () => {
    const hs = init()
    expect(historyReducer(hs, { type: 'commit' })).toBe(hs)
  })

  it('ignoriert Undo/Redo während einer offenen Transaktion (Strg+Z mitten im Ziehen)', () => {
    let hs = init()
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    hs = historyReducer(hs, { type: 'undo' })
    hs = historyReducer(hs, { type: 'redo' })
    hs = mutate(hs, { type: 'addBed', bed: bed('b2') })
    hs = historyReducer(hs, { type: 'undo' })
    // jetzt: past = [leer], future = [b1+b2]

    hs = historyReducer(hs, { type: 'begin' })
    hs = mutate(hs, { type: 'updateBed', id: 'b1', patch: { x: 40 } })
    const during = hs
    expect(historyReducer(hs, { type: 'undo' })).toBe(during)
    expect(historyReducer(hs, { type: 'redo' })).toBe(during)

    hs = mutate(hs, { type: 'updateBed', id: 'b1', patch: { x: 60 } })
    hs = historyReducer(hs, { type: 'commit' })
    expect(hs.past).toHaveLength(2)
    expect(hs.present.beds[0].x).toBe(60)

    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.present.beds[0].x).toBe(10)
  })

  it('behält beim verschachtelten begin den ursprünglichen Ausgangszustand', () => {
    let hs = init()
    hs = historyReducer(hs, { type: 'begin' })
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    hs = historyReducer(hs, { type: 'begin' })
    hs = mutate(hs, { type: 'updateBed', id: 'b1', patch: { x: 40 } })
    hs = historyReducer(hs, { type: 'commit' })
    hs = historyReducer(hs, { type: 'commit' })
    expect(hs.past).toHaveLength(1)

    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.present.beds).toHaveLength(0)
  })

  it('schließt die äußere Transaktion erst mit dem äußersten commit', () => {
    let hs = init()
    hs = historyReducer(hs, { type: 'begin' })
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    hs = historyReducer(hs, { type: 'begin' })
    hs = mutate(hs, { type: 'updateBed', id: 'b1', patch: { x: 40 } })
    hs = historyReducer(hs, { type: 'commit' })
    expect(hs.past).toHaveLength(0)

    hs = mutate(hs, { type: 'updateBed', id: 'b1', patch: { x: 60 } })
    hs = historyReducer(hs, { type: 'commit' })
    expect(hs.past).toHaveLength(1)
    expect(hs.present.beds[0].x).toBe(60)

    hs = historyReducer(hs, { type: 'undo' })
    expect(hs.present.beds).toHaveLength(0)
  })
})

describe('historyReducer – Grenzen', () => {
  it('begrenzt die History auf die letzten 10 Schritte', () => {
    let hs = init()
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      hs = mutate(hs, { type: 'addBed', bed: bed(`b${i}`) })
    }
    expect(hs.past).toHaveLength(MAX_HISTORY)
    expect(hs.present.beds).toHaveLength(MAX_HISTORY + 5)
  })

  it('leert die History bei einem load (Import/Reset)', () => {
    let hs = init()
    hs = mutate(hs, { type: 'addBed', bed: bed('b1') })
    hs = historyReducer(hs, { type: 'begin' })
    hs = historyReducer(hs, { type: 'undo' }) // macht Vergangenheit
    hs = mutate(hs, { type: 'addBed', bed: bed('b2') })

    const fresh = createDefaultState()
    hs = mutate(hs, { type: 'load', state: fresh })
    expect(hs.past).toHaveLength(0)
    expect(hs.future).toHaveLength(0)
    expect(hs.txnDepth).toBe(0)
    expect(hs.present).toEqual(fresh)
  })
})