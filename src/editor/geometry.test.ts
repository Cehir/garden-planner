import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HANDLES,
  HANDLE_SIZE,
  MIN_SIZE,
  handlePos,
  hitTest,
  nearHandle,
  pointFromClient,
  resizeRect,
} from './geometry'

const orig = { x: 10, y: 20, w: 100, h: 50 }

describe('resizeRect', () => {
  it('Ziehen nach Osten vergrößert die Breite, x bleibt', () => {
    const r = resizeRect(orig, 'e', 30, 0)
    expect(r.w).toBe(130)
    expect(r.x).toBe(10)
  })
  it('Ziehen nach Westen verschiebt x, Breite auf MIN_SIZE begrenzt', () => {
    const r = resizeRect(orig, 'w', 200, 0)
    expect(r.w).toBe(MIN_SIZE)
    expect(r.x).toBe(10 + (100 - MIN_SIZE))
  })
  it('Nord-Anfasser verschiebt y und verkleinert die Höhe', () => {
    const r = resizeRect(orig, 'n', 0, 20)
    expect(r.y).toBe(40)
    expect(r.h).toBe(30)
  })
  it('Eck-Anfasser ändert beide Achsen', () => {
    expect(resizeRect(orig, 'se', 20, 10)).toEqual({ x: 10, y: 20, w: 120, h: 60 })
  })
  it('rastet die Verschiebung auf 10 cm ein', () => {
    expect(resizeRect(orig, 'e', 14, 0).w).toBe(110)
  })
})

describe('hitTest', () => {
  it('true innerhalb und auf dem Rand, false außerhalb', () => {
    expect(hitTest(50, 30, orig)).toBe(true)
    expect(hitTest(110, 70, orig)).toBe(true)
    expect(hitTest(200, 30, orig)).toBe(false)
  })
})

describe('handlePos', () => {
  it('liefert Ecken und Kantenmitten', () => {
    expect(handlePos(orig, 'nw')).toEqual({ x: 10, y: 20 })
    expect(handlePos(orig, 'se')).toEqual({ x: 110, y: 70 })
    expect(handlePos(orig, 'n')).toEqual({ x: 60, y: 20 })
    expect(handlePos(orig, 'w')).toEqual({ x: 10, y: 45 })
  })
})

describe('nearHandle', () => {
  it('findet den Anfasser innerhalb von HANDLE_SIZE', () => {
    expect(nearHandle(110 + HANDLE_SIZE, 45, orig)).toBe('e')
    expect(nearHandle(12, 22, orig)).toBe('nw')
  })
  it('null außerhalb der Anfasser', () => {
    expect(nearHandle(60, 45, orig)).toBeNull()
  })
  it('kennt alle acht Anfasser', () => {
    expect(HANDLES).toHaveLength(8)
    for (const h of HANDLES) {
      const p = handlePos(orig, h)
      expect(nearHandle(p.x, p.y, orig)).toBe(h)
    }
  })
})

describe('pointFromClient', () => {
  afterEach(() => vi.restoreAllMocks())

  it('rechnet über die inverse Screen-CTM in SVG-Koordinaten um', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    // SVG um (10, 20) verschoben und 2× gezoomt
    vi.spyOn(svg, 'getScreenCTM').mockReturnValue(new DOMMatrix([2, 0, 0, 2, 10, 20]))
    expect(pointFromClient(svg, 110, 220)).toEqual({ x: 50, y: 100 })
  })
  it('liefert (0, 0) ohne SVG oder ohne CTM', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    vi.spyOn(svg, 'getScreenCTM').mockReturnValue(null)
    expect(pointFromClient(svg, 5, 5)).toEqual({ x: 0, y: 0 })
    expect(pointFromClient(null, 5, 5)).toEqual({ x: 0, y: 0 })
  })
})
