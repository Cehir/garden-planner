import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Bed, Phase, PlacedPlant, Plant, Season, Selected, Tool } from '../types'
import { useHistory, useStoreDispatch, useStoreState } from '../storeContext'
import { uid, placedInYear } from '../utils'
import { computeConflicts } from '../shadow'
import { phaseMatchesSeason } from '../seasons'
import { plantsById } from '../selectors'
import { DEFAULT_BED_COLOR } from '../palette'
import { pointFromClient } from '../editor/geometry'
import type { Rect } from '../editor/geometry'
import { dragMove, pointerDownIntent } from '../editor/drag'
import type { DragState } from '../editor/drag'
import GridLayer from '../editor/GridLayer'
import BedShape from '../editor/BedShape'
import BedHandles from '../editor/BedHandles'
import ShadowLayer from '../editor/ShadowLayer'
import PlacedPlantShape from '../editor/PlacedPlantShape'
import DraftRect from '../editor/DraftRect'
import Compass from '../editor/Compass'

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
  const [draft, setDraft] = useState<Rect | null>(null)

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
          <GridLayer width={garden.width} height={garden.height} />

          {beds.map((bed) => (
            <BedShape
              key={bed.id}
              bed={bed}
              selected={selectedBed?.id === bed.id}
            />
          ))}

          <ShadowLayer placed={visiblePlaced} beds={beds} plantById={plantById} />

          {visiblePlaced.map((p) => {
            const bed = beds.find((b) => b.id === p.bedId)
            if (!bed) return null
            const plant = plantById.get(p.plantId)
            const inSeason = season !== 'all' && plant ? phaseMatchesSeason(plant, phase, season) : null
            return (
              <PlacedPlantShape
                key={p.id}
                placed={p}
                plant={plant}
                bed={bed}
                selected={selectedPlaced?.id === p.id}
                dimmed={inSeason === false}
                highlighted={inSeason === true}
                conflicted={conflictedIds.has(p.id)}
                showRotation={showRotation}
              />
            )
          })}

          {draft && <DraftRect rect={draft} />}

          {selectedBed && <BedHandles rect={selectedBed} />}
        </svg>
      </div>
      <Compass />
      </div>
    </div>
  )
}
