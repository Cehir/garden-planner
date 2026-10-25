import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  clampZoom,
  FIT_HEADER_GAP,
  FIT_MAX,
  FIT_MIN,
  FIT_SIDE_GAP,
  fitZoomFor,
  useFitZoom,
  ZOOM_MAX,
  ZOOM_MIN,
} from './useFitZoom'

describe('fitZoomFor', () => {
  it('nimmt den kleineren Faktor aus Breite und Höhe', () => {
    const viewport = { width: FIT_SIDE_GAP + 800, height: FIT_HEADER_GAP + 300 }
    // Breite: 800/800 = 1, Höhe: 300/600 = 0.5
    expect(fitZoomFor(viewport, { width: 800, height: 600 })).toBe(0.5)
  })

  it('begrenzt nach oben auf FIT_MAX', () => {
    const viewport = { width: 10_000, height: 10_000 }
    expect(fitZoomFor(viewport, { width: 10, height: 10 })).toBe(FIT_MAX)
  })

  it('begrenzt nach unten auf FIT_MIN (auch bei sehr kleinem Fenster)', () => {
    const viewport = { width: 100, height: 100 }
    expect(fitZoomFor(viewport, { width: 800, height: 600 })).toBe(FIT_MIN)
  })
})

describe('clampZoom', () => {
  it('hält manuellen Zoom zwischen ZOOM_MIN und ZOOM_MAX', () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN)
    expect(clampZoom(1.5)).toBe(1.5)
    expect(clampZoom(99)).toBe(ZOOM_MAX)
  })
})

describe('useFitZoom', () => {
  const garden = { width: 800, height: 600 }
  const expectedFit = () => fitZoomFor({ width: window.innerWidth, height: window.innerHeight }, garden)

  it('startet mit dem eingepassten Zoom', () => {
    const { result } = renderHook(() => useFitZoom(garden))
    expect(result.current.zoom).toBe(expectedFit())
  })

  it('übernimmt manuellen Zoom (begrenzt) und kehrt mit fit() zum Einpassen zurück', () => {
    const { result } = renderHook(() => useFitZoom(garden))
    act(() => result.current.setZoom(42))
    expect(result.current.zoom).toBe(ZOOM_MAX)
    act(() => result.current.fit())
    expect(result.current.zoom).toBe(expectedFit())
  })
})
