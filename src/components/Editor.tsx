import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Bed, PlacedPlant, Plant, Selected, Tool } from '../types'
import { useStore } from '../store'
import { snap, uid } from '../utils'

const SNAP = 10
const MIN_SIZE = 20
const HANDLE_SIZE = 8

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

type DragState =
  | { kind: 'draw'; startX: number; startY: number }
  | { kind: 'moveBed'; bedId: string; startX: number; startY: number; origX: number; origY: number }
  | {
      kind: 'resizeBed'
      bedId: string
      handle: Handle
      startX: number
      startY: number
      orig: Pick<Bed, 'x' | 'y' | 'w' | 'h'>
    }
  | {
      kind: 'movePlaced'
      id: string
      bedId: string
      startX: number
      startY: number
      origX: number
      origY: number
    }
  | {
      kind: 'resizePlaced'
      id: string
      centerX: number
      centerY: number
      startX: number
      startY: number
      origSize: number
    }

interface EditorProps {
  tool: Tool
  selected: Selected | null
  onSelect: (sel: Selected | null) => void
  placedPlant: Plant | null
  zoom: number
}

function hitTest(x: number, y: number, rect: { x: number; y: number; w: number; h: number }) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
}

function resizeRect(
  orig: Pick<Bed, 'x' | 'y' | 'w' | 'h'>,
  handle: Handle,
  dx: number,
  dy: number,
): Pick<Bed, 'x' | 'y' | 'w' | 'h'> {
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

function handlePos(rect: Pick<Bed, 'x' | 'y' | 'w' | 'h'>, h: Handle) {
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const xs = h.includes('e') ? rect.x + rect.w : h.includes('w') ? rect.x : cx
  const ys = h.includes('s') ? rect.y + rect.h : h.includes('n') ? rect.y : cy
  return { x: xs, y: ys }
}

function nearHandle(
  x: number,
  y: number,
  rect: Pick<Bed, 'x' | 'y' | 'w' | 'h'>,
): Handle | null {
  for (const h of HANDLES) {
    const p = handlePos(rect, h)
    if (Math.abs(x - p.x) <= HANDLE_SIZE && Math.abs(y - p.y) <= HANDLE_SIZE) {
      return h
    }
  }
  return null
}

export default function Editor({ tool, selected, onSelect, placedPlant, zoom }: EditorProps) {
  const { state, dispatch } = useStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const { garden, beds, plants, placedPlants } = state

  const selectedBed: Bed | null =
    selected?.kind === 'bed' ? beds.find((b) => b.id === selected.id) ?? null : null
  const selectedPlaced: PlacedPlant | null =
    selected?.kind === 'placed' ? placedPlants.find((p) => p.id === selected.id) ?? null : null
  const plantById = new Map(plants.map((p) => [p.id, p]))

  function getPoint(e: ReactPointerEvent<SVGSVGElement> | PointerEvent): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = new DOMPoint(e.clientX, e.clientY)
    const ctm = svg.getScreenCTM()
    if (ctm) {
      const p = pt.matrixTransform(ctm.inverse())
      return { x: p.x, y: p.y }
    }
    return { x: 0, y: 0 }
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    const svg = svgRef.current
    if (!svg) return
    const point = getPoint(e)
    svg.setPointerCapture(e.pointerId)

    if (tool === 'bed') {
      dragRef.current = { kind: 'draw', startX: point.x, startY: point.y }
      return
    }

    if (tool === 'plant') {
      if (!placedPlant) return
      const existing = placedPlants.find((p) => {
        const bed = beds.find((b) => b.id === p.bedId)
        if (!bed) return false
        return Math.hypot(point.x - (bed.x + p.x * bed.w), point.y - (bed.y + p.y * bed.h)) <= p.size / 2
      })
      if (existing) {
        onSelect({ kind: 'placed', id: existing.id })
        return
      }
      const bed = beds.find((b) => hitTest(point.x, point.y, b))
      if (!bed) return
      const relX = Math.min(1, Math.max(0, (point.x - bed.x) / bed.w))
      const relY = Math.min(1, Math.max(0, (point.y - bed.y) / bed.h))
      dispatch({
        type: 'addPlacedPlant',
        plant: {
          id: uid('plp'),
          bedId: bed.id,
          plantId: placedPlant.id,
          x: relX,
          y: relY,
          size: placedPlant.spacing,
        },
      })
      return
    }

    // select tool
    if (selectedBed) {
      const handle = nearHandle(point.x, point.y, selectedBed)
      if (handle) {
        dragRef.current = {
          kind: 'resizeBed',
          bedId: selectedBed.id,
          handle,
          startX: point.x,
          startY: point.y,
          orig: { x: selectedBed.x, y: selectedBed.y, w: selectedBed.w, h: selectedBed.h },
        }
        return
      }
    }

    for (const p of placedPlants) {
      const bed = beds.find((b) => b.id === p.bedId)
      if (!bed) continue
      const cx = bed.x + p.x * bed.w
      const cy = bed.y + p.y * bed.h
      const r = p.size / 2
      if (selectedPlaced?.id === p.id && Math.hypot(point.x - (cx + r), point.y - cy) <= 10) {
        dragRef.current = {
          kind: 'resizePlaced',
          id: p.id,
          centerX: cx,
          centerY: cy,
          startX: point.x,
          startY: point.y,
          origSize: p.size,
        }
        return
      }
      if (Math.hypot(point.x - cx, point.y - cy) <= r) {
        onSelect({ kind: 'placed', id: p.id })
        dragRef.current = {
          kind: 'movePlaced',
          id: p.id,
          bedId: p.bedId,
          startX: point.x,
          startY: point.y,
          origX: p.x,
          origY: p.y,
        }
        return
      }
    }

    for (const bed of beds) {
      if (hitTest(point.x, point.y, bed)) {
        onSelect({ kind: 'bed', id: bed.id })
        dragRef.current = {
          kind: 'moveBed',
          bedId: bed.id,
          startX: point.x,
          startY: point.y,
          origX: bed.x,
          origY: bed.y,
        }
        return
      }
    }

    onSelect(null)
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag) return
    const point = getPoint(e)

    switch (drag.kind) {
      case 'draw': {
        const x = Math.min(drag.startX, point.x)
        const y = Math.min(drag.startY, point.y)
        const w = Math.max(Math.abs(point.x - drag.startX), MIN_SIZE)
        const h = Math.max(Math.abs(point.y - drag.startY), MIN_SIZE)
        setDraft({ x: snap(x), y: snap(y), w: snap(w), h: snap(h) })
        break
      }
      case 'moveBed': {
        const dx = snap(point.x - drag.startX)
        const dy = snap(point.y - drag.startY)
        dispatch({
          type: 'updateBed',
          id: drag.bedId,
          patch: { x: drag.origX + dx, y: drag.origY + dy },
        })
        break
      }
      case 'resizeBed': {
        const dx = point.x - drag.startX
        const dy = point.y - drag.startY
        const rect = resizeRect(drag.orig, drag.handle, dx, dy)
        dispatch({ type: 'updateBed', id: drag.bedId, patch: rect })
        break
      }
      case 'movePlaced': {
        const bed = beds.find((b) => b.id === drag.bedId)
        if (!bed) break
        const absX = snap(drag.origX * bed.w + bed.x + (point.x - drag.startX))
        const absY = snap(drag.origY * bed.h + bed.y + (point.y - drag.startY))
        const relX = Math.min(1, Math.max(0, (absX - bed.x) / bed.w))
        const relY = Math.min(1, Math.max(0, (absY - bed.y) / bed.h))
        dispatch({ type: 'updatePlacedPlant', id: drag.id, patch: { x: relX, y: relY } })
        break
      }
      case 'resizePlaced': {
        const dist = Math.hypot(point.x - drag.centerX, point.y - drag.centerY)
        const size = Math.min(200, Math.max(10, snap(dist * 2, 5)))
        dispatch({ type: 'updatePlacedPlant', id: drag.id, patch: { size } })
        break
      }
    }
  }

  function handlePointerUp() {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (drag.kind === 'draw' && draft) {
      const id = uid('beet')
      dispatch({
        type: 'addBed',
        bed: {
          id,
          name: `Beet ${beds.length + 1}`,
          x: draft.x,
          y: draft.y,
          w: draft.w,
          h: draft.h,
          color: '#7fb069',
          notes: '',
        },
      })
      onSelect({ kind: 'bed', id })
      setDraft(null)
    }
  }

  const gridLines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
  for (let x = 0; x <= garden.width; x += SNAP) {
    gridLines.push({
      x1: x,
      y1: 0,
      x2: x,
      y2: garden.height,
      major: x % 50 === 0,
    })
  }
  for (let y = 0; y <= garden.height; y += SNAP) {
    gridLines.push({
      x1: 0,
      y1: y,
      x2: garden.width,
      y2: y,
      major: y % 50 === 0,
    })
  }

  const topLabels: { x: number; label: string }[] = []
  for (let x = 100; x <= garden.width; x += 100) {
    topLabels.push({ x, label: `${x}` })
  }
  const leftLabels: { y: number; label: string }[] = []
  for (let y = 100; y <= garden.height; y += 100) {
    leftLabels.push({ y, label: `${y}` })
  }

  return (
    <div
      className="editor-scroll"
      style={{
        backgroundImage:
          'radial-gradient(circle, #e5e0d5 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div
        className="editor-stage"
        style={{ width: garden.width * zoom, height: garden.height * zoom }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${garden.width} ${garden.height}`}
          className="editor-svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ cursor: tool === 'bed' ? 'crosshair' : tool === 'plant' ? 'pointer' : 'default' }}
        >
          <rect
            x={0}
            y={0}
            width={garden.width}
            height={garden.height}
            fill="#fdfbf5"
            stroke="#a89f8d"
            strokeWidth={2}
          />
          {gridLines.map((l, i) => (
            <line
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={l.major ? '#ddd3bf' : '#eee8da'}
              strokeWidth={1}
            />
          ))}
          {topLabels.map((l, i) => (
            <text
              key={`r${i}`}
              x={l.x}
              y={0}
              fill="#b3a892"
              fontSize={12}
              textAnchor="middle"
              dy={-4}
              pointerEvents="none"
            >
              {l.label}
            </text>
          ))}
          {leftLabels.map((l, i) => (
            <text
              key={`rb${i}`}
              x={0}
              y={l.y}
              fill="#b3a892"
              fontSize={12}
              dx={4}
              dy={4}
              pointerEvents="none"
            >
              {l.label}
            </text>
          ))}

          {beds.map((bed) => (
            <BedShape
              key={bed.id}
              bed={bed}
              selected={selectedBed?.id === bed.id}
            />
          ))}

          {placedPlants.map((p) => {
            const bed = beds.find((b) => b.id === p.bedId)
            if (!bed) return null
            const plant = plantById.get(p.plantId)
            const cx = bed.x + p.x * bed.w
            const cy = bed.y + p.y * bed.h
            const r = p.size / 2
            const isSel = selectedPlaced?.id === p.id
            return (
              <g key={p.id} className={isSel ? 'plant selected' : 'plant'}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + (isSel ? 3 : 0)}
                  fill={plant?.color ?? '#999'}
                  fillOpacity={0.35}
                  stroke={plant?.color ?? '#999'}
                  strokeWidth={isSel ? 3 : 1.5}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={p.size * 0.8}
                  pointerEvents="none"
                >
                  {plant?.emoji ?? '❓'}
                </text>
                {isSel && (
                  <circle
                    cx={cx + r}
                    cy={cy}
                    r={HANDLE_SIZE / 2}
                    fill="#fff"
                    stroke="#2f6f4f"
                    strokeWidth={2}
                    className="resize-handle"
                  />
                )}
              </g>
            )
          })}

          {draft && (
            <rect
              x={draft.x}
              y={draft.y}
              width={draft.w}
              height={draft.h}
              fill="#7fb069"
              fillOpacity={0.25}
              stroke="#2f6f4f"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          )}

          {selectedBed &&
            HANDLES.map((h) => {
              const p = handlePos(selectedBed, h)
              return (
                <rect
                  key={h}
                  x={p.x - HANDLE_SIZE / 2}
                  y={p.y - HANDLE_SIZE / 2}
                  width={HANDLE_SIZE}
                  height={HANDLE_SIZE}
                  fill="#fff"
                  stroke="#2f6f4f"
                  strokeWidth={2}
                  className="resize-handle"
                />
              )
            })}
        </svg>
      </div>
    </div>
  )
}

function BedShape({ bed, selected }: { bed: Bed; selected: boolean }) {
  const fontSize = Math.max(8, Math.min(16, Math.min(bed.w, bed.h) * 0.18))
  return (
    <g className={selected ? 'bed selected' : 'bed'}>
      <rect
        x={bed.x}
        y={bed.y}
        width={bed.w}
        height={bed.h}
        fill={bed.color}
        fillOpacity={selected ? 0.55 : 0.35}
        stroke={selected ? '#2f6f4f' : bed.color}
        strokeWidth={selected ? 3 : 1.5}
        rx={3}
      />
      {bed.name && (
        <text
          x={bed.x + bed.w / 2}
          y={bed.y + bed.h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fill="#3a362e"
          stroke="#fff"
          strokeWidth={3}
          paintOrder="stroke"
          pointerEvents="none"
        >
          {bed.name}
        </text>
      )}
    </g>
  )
}
