import type { Bed, Point } from '../types'
import { snap } from '../utils'

export const MIN_SIZE = 20
export const HANDLE_SIZE = 8

export type Rect = Pick<Bed, 'x' | 'y' | 'w' | 'h'>
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function hitTest(x: number, y: number, rect: Rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
}

export function resizeRect(orig: Rect, handle: Handle, dx: number, dy: number): Rect {
  const dxs = snap(dx)
  const dys = snap(dy)
  let { x, y, w, h } = orig
  if (handle.includes('e')) w = Math.max(MIN_SIZE, orig.w + dxs)
  if (handle.includes('s')) h = Math.max(MIN_SIZE, orig.h + dys)
  if (handle.includes('w')) {
    w = Math.max(MIN_SIZE, orig.w - dxs)
    x = orig.x + (orig.w - w)
  }
  if (handle.includes('n')) {
    h = Math.max(MIN_SIZE, orig.h - dys)
    y = orig.y + (orig.h - h)
  }
  return { x, y, w, h }
}

export function handlePos(rect: Rect, h: Handle) {
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const xs = h.includes('e') ? rect.x + rect.w : h.includes('w') ? rect.x : cx
  const ys = h.includes('s') ? rect.y + rect.h : h.includes('n') ? rect.y : cy
  return { x: xs, y: ys }
}

export function nearHandle(x: number, y: number, rect: Rect): Handle | null {
  for (const h of HANDLES) {
    const p = handlePos(rect, h)
    if (Math.abs(x - p.x) <= HANDLE_SIZE && Math.abs(y - p.y) <= HANDLE_SIZE) {
      return h
    }
  }
  return null
}

// Bildschirmkoordinaten → SVG-Koordinaten (cm) über die inverse Screen-CTM
export function pointFromClient(
  svg: SVGSVGElement | null,
  clientX: number,
  clientY: number,
): Point {
  if (!svg) return { x: 0, y: 0 }
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}
