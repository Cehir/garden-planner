import { useCallback, useMemo, useState } from 'react'
import type { Garden } from '../types'

/** Vertikaler Platz für Toolbar, Mobile-Leiste und Statuszeile (px). */
export const FIT_HEADER_GAP = 190
/** Horizontaler Platz für die beiden Seitenleisten (px). */
export const FIT_SIDE_GAP = 460
export const FIT_MIN = 0.15
export const FIT_MAX = 3
/** Grenzen für manuelles Zoomen. */
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 5

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Zoom, bei dem der ganze Garten in den verfügbaren Fensterbereich passt. */
export function fitZoomFor(
  viewport: { width: number; height: number },
  garden: Pick<Garden, 'width' | 'height'>,
): number {
  const h = clamp((viewport.height - FIT_HEADER_GAP) / garden.height, FIT_MIN, FIT_MAX)
  const w = clamp((viewport.width - FIT_SIDE_GAP) / garden.width, FIT_MIN, FIT_MAX)
  return Math.min(h, w)
}

export function clampZoom(z: number): number {
  return clamp(z, ZOOM_MIN, ZOOM_MAX)
}

/** Zoom-Zustand: manueller Zoom, sonst „Einpassen“ (aus Fenster- und Gartengröße abgeleitet). */
export function useFitZoom(garden: Pick<Garden, 'width' | 'height'>) {
  const [userZoom, setUserZoom] = useState<number | null>(null)
  const { width, height } = garden

  // Aus der (externen) Fenstergröße abgeleitet, daher beim Rendern berechnet statt gespeichert
  const fitZoom = useMemo(
    () => fitZoomFor({ width: window.innerWidth, height: window.innerHeight }, { width, height }),
    [width, height],
  )

  const fit = useCallback(() => setUserZoom(null), [])
  const setZoom = useCallback((z: number) => setUserZoom(clampZoom(z)), [])

  return { zoom: userZoom ?? fitZoom, setZoom, fit }
}
