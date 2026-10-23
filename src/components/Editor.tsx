import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Bed, Phase, PlacedPlant, Plant, Season, Selected, Tool } from '../types'
import { useHistory, useStoreDispatch, useStoreState } from '../storeContext'
import { uid, placedInYear } from '../utils'
import { computeConflicts, shadowPolygon } from '../shadow'
import { phaseMatchesSeason } from '../seasons'
import { plantsById, placedCenter } from '../selectors'
import { gridLines as buildGridLines } from '../grid'
import { DEFAULT_BED_COLOR } from '../palette'
import { HANDLES, HANDLE_SIZE, handlePos, pointFromClient } from '../editor/geometry'
import { dragMove, pointerDownIntent } from '../editor/drag'
import type { DragState } from '../editor/drag'

interface EditorProps {
  tool: Tool
  selected: Selected | null
  onSelect: (sel: Selected | null) => void
  placedPlant: Plant | null
  zoom: number
  season: Season
  phase: Phase
  showRotation: boolean
  year: number
}

export default function Editor({ tool, selected, onSelect, placedPlant, zoom, season, phase, showRotation, year }: EditorProps) {
  const state = useStoreState()
  const dispatch = useStoreDispatch()
  const { beginTransaction, commitTransaction } = useHistory()
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  // Eigene Buchführung, damit pointerup, pointercancel und lostpointercapture die
  // Transaktion gefahrlos mehrfach beenden können und sie nie offen hängen bleibt
  const txnOpenRef = useRef(false)
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const { garden, beds, plants, placedPlants } = state

  const visiblePlaced = useMemo(() => placedInYear(placedPlants, year), [placedPlants, year])

  const selectedBed: Bed | null =
    selected?.kind === 'bed' ? beds.find((b) => b.id === selected.id) ?? null : null
  const selectedPlaced: PlacedPlant | null =
    selected?.kind === 'placed' ? placedPlants.find((p) => p.id === selected.id) ?? null : null
  const plantById = plantsById(plants)
  const conflicts = useMemo(() => computeConflicts(visiblePlaced, plants, beds), [visiblePlaced, plants, beds])
  const conflictedIds = useMemo(() => new Set(conflicts.map((c) => c.targetId)), [conflicts])

  function getPoint(e: ReactPointerEvent<SVGSVGElement>) {
    return pointFromClient(svgRef.current, e.clientX, e.clientY)
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    const svg = svgRef.current
    if (!svg) return
    const point = getPoint(e)
    svg.setPointerCapture(e.pointerId)

    const intent = pointerDownIntent(point, {
      tool,
      beds,
      visiblePlaced,
      selectedBed,
      selectedPlaced,
      hasPlantToPlace: placedPlant !== null,
    })
    switch (intent.kind) {
      case 'drag':
        if (intent.select) onSelect(intent.select)
        dragRef.current = intent.drag
        startTransaction()
        break
      case 'place':
        if (!placedPlant) break
        dispatch({
          type: 'addPlacedPlant',
          plant: {
            id: uid('plp'),
            bedId: intent.bed.id,
            plantId: placedPlant.id,
            x: intent.relX,
            y: intent.relY,
            size: placedPlant.spacing,
            plantedYear: year,
          },
        })
        break
      case 'deselect':
        onSelect(null)
        break
    }
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag) return
    const effect = dragMove(drag, getPoint(e), beds)
    if (effect?.kind === 'draft') setDraft(effect.rect)
    else if (effect) dispatch(effect.action)
  }

  function startTransaction() {
    if (txnOpenRef.current) return
    txnOpenRef.current = true
    beginTransaction()
  }

  function endTransaction() {
    if (!txnOpenRef.current) return
    txnOpenRef.current = false
    commitTransaction()
  }

  // Beim Unmount mitten im Ziehen die Transaktion schließen
  useEffect(
    () => () => {
      if (txnOpenRef.current) {
        txnOpenRef.current = false
        commitTransaction()
      }
    },
    [commitTransaction],
  )

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
          color: DEFAULT_BED_COLOR,
          notes: '',
        },
      })
      onSelect({ kind: 'bed', id })
      setDraft(null)
    }
    endTransaction()
  }

  // Auch bei verlorenem Pointer-Capture (ohne pointerup), z. B. Fensterwechsel beim Ziehen
  function handlePointerCancel() {
    dragRef.current = null
    setDraft(null)
    endTransaction()
  }

  const gridLines = buildGridLines(garden.width, garden.height)

  const topLabels: { x: number; label: string }[] = []
  for (let x = 100; x <= garden.width; x += 100) {
    topLabels.push({ x, label: `${x}` })
  }
  const leftLabels: { y: number; label: string }[] = []
  for (let y = 100; y <= garden.height; y += 100) {
    leftLabels.push({ y, label: `${y}` })
  }

  return (
    <div className="editor-wrap">
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
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handlePointerCancel}
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

          {visiblePlaced.map((p) => {
            const bed = beds.find((b) => b.id === p.bedId)
            if (!bed) return null
            const plant = plantById.get(p.plantId)
            const shape = plant ? shadowPolygon(plant, p, bed) : null
            if (!shape) return null
            return (
              <polygon
                key={`sh-${p.id}`}
                points={shape.polygon.map((pt) => pt.join(',')).join(' ')}
                fill="#3a362e"
                fillOpacity={0.12}
                pointerEvents="none"
              />
            )
          })}

          {visiblePlaced.map((p) => {
            const bed = beds.find((b) => b.id === p.bedId)
            if (!bed) return null
            const plant = plantById.get(p.plantId)
            const { x: cx, y: cy } = placedCenter(p, bed)
            const r = p.size / 2
            const isSel = selectedPlaced?.id === p.id
            const dimmed = season !== 'all' && plant ? !phaseMatchesSeason(plant, phase, season) : false
            const highlighted = season !== 'all' && plant ? phaseMatchesSeason(plant, phase, season) : false
            return (
              <g
                key={p.id}
                className={isSel ? 'plant selected' : 'plant'}
                style={{ opacity: dimmed ? 0.3 : 1 }}
              >
                {highlighted && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 6}
                    fill="none"
                    stroke="#2f6f4f"
                    strokeWidth={3}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                  />
                )}
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
                {conflictedIds.has(p.id) && (
                  <text
                    x={cx}
                    y={cy - r - 6}
                    textAnchor="middle"
                    fontSize={r * 0.7}
                    pointerEvents="none"
                  >
                    ⚠️
                  </text>
                )}
                {showRotation && (
                  <text
                    x={cx}
                    y={cy + r + 14}
                    textAnchor="middle"
                    fontSize={Math.max(9, r * 0.6)}
                    fill="#3a362e"
                    stroke="#fff"
                    strokeWidth={2.5}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {p.plantedYear}
                  </text>
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
              fill={DEFAULT_BED_COLOR}
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
      <div className="compass" aria-hidden="true">
        <svg viewBox="-40 -40 80 80" width="56" height="56">
          <circle cx={0} cy={0} r={30} fill="none" stroke="#a89f8d" strokeWidth={1.5} strokeDasharray="2 3" />
          <line x1={0} y1={-24} x2={0} y2={-30} stroke="#2f6f4f" strokeWidth={3} />
          <polygon points="0,-34 -5,-24 5,-24" fill="#2f6f4f" />
          <line x1={0} y1={24} x2={0} y2={30} stroke="#c9beb0" strokeWidth={1.5} />
          <line x1={-24} y1={0} x2={-30} y2={0} stroke="#c9beb0" strokeWidth={1.5} />
          <line x1={24} y1={0} x2={30} y2={0} stroke="#c9beb0" strokeWidth={1.5} />
          <text x={0} y={-36} textAnchor="middle" fontSize={11} fontWeight={700} fill="#2f6f4f">N</text>
          <text x={0} y={41} textAnchor="middle" fontSize={9} fill="#8a8272">S</text>
          <text x={-41} y={3} textAnchor="middle" fontSize={9} fill="#8a8272">W</text>
          <text x={41} y={3} textAnchor="middle" fontSize={9} fill="#8a8272">O</text>
        </svg>
        <span className="compass-note">Sonne ⬇ Süden · Schatten ⬆ Norden</span>
      </div>
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
