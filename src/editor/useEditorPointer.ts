import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { Bed, PlacedPlant, Plant, Selected, Tool } from '../types'
import { useHistory, useStoreDispatch } from '../storeContext'
import { uid } from '../utils'
import { DEFAULT_BED_COLOR } from '../palette'
import { pointFromClient } from './geometry'
import type { Rect } from './geometry'
import { dragMove, pointerDownIntent } from './drag'
import type { DragState } from './drag'

interface EditorPointerOptions {
  svgRef: RefObject<SVGSVGElement | null>
  tool: Tool
  beds: Bed[]
  visiblePlaced: PlacedPlant[]
  selectedBed: Bed | null
  selectedPlaced: PlacedPlant | null
  placedPlant: Plant | null
  year: number
  onSelect: (sel: Selected | null) => void
}

type SvgPointerEvent = ReactPointerEvent<SVGSVGElement>

/** Zeigergesten des Editors: Beete aufziehen/verschieben/skalieren, Pflanzen setzen/ziehen. */
export function useEditorPointer({
  svgRef,
  tool,
  beds,
  visiblePlaced,
  selectedBed,
  selectedPlaced,
  placedPlant,
  year,
  onSelect,
}: EditorPointerOptions) {
  const dispatch = useStoreDispatch()
  const { beginTransaction, commitTransaction } = useHistory()
  const dragRef = useRef<DragState | null>(null)
  // Eigene Buchführung, damit pointerup, pointercancel und lostpointercapture die
  // Transaktion gefahrlos mehrfach beenden können und sie nie offen hängen bleibt
  const txnOpenRef = useRef(false)
  const [draft, setDraft] = useState<Rect | null>(null)

  function getPoint(e: SvgPointerEvent) {
    return pointFromClient(svgRef.current, e.clientX, e.clientY)
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

  function onPointerDown(e: SvgPointerEvent) {
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

  function onPointerMove(e: SvgPointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    const effect = dragMove(drag, getPoint(e), beds)
    if (effect?.kind === 'draft') setDraft(effect.rect)
    else if (effect) dispatch(effect.action)
  }

  function onPointerUp() {
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
  function onPointerCancel() {
    dragRef.current = null
    setDraft(null)
    endTransaction()
  }

  return {
    draft,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: onPointerCancel,
    },
  }
}
