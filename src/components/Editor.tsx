import { useMemo, useRef } from 'react'
import type { Bed, Phase, PlacedPlant, Plant, Season, Selected, Tool } from '../types'
import { useStoreState } from '../storeContext'
import { placedInYear } from '../utils'
import { computeConflicts } from '../shadow'
import { phaseMatchesSeason } from '../seasons'
import { bedsById, plantsById } from '../selectors'
import { useEditorPointer } from '../editor/useEditorPointer'
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
  const { garden, beds, plants, placedPlants } = useStoreState()
  const svgRef = useRef<SVGSVGElement>(null)

  const visiblePlaced = useMemo(() => placedInYear(placedPlants, year), [placedPlants, year])

  const selectedBed: Bed | null =
    selected?.kind === 'bed' ? beds.find((b) => b.id === selected.id) ?? null : null
  const selectedPlaced: PlacedPlant | null =
    selected?.kind === 'placed' ? placedPlants.find((p) => p.id === selected.id) ?? null : null
  const plantById = useMemo(() => plantsById(plants), [plants])
  const bedById = useMemo(() => bedsById(beds), [beds])
  const conflicts = useMemo(() => computeConflicts(visiblePlaced, plants, beds), [visiblePlaced, plants, beds])
  const conflictedIds = useMemo(() => new Set(conflicts.map((c) => c.targetId)), [conflicts])

  const { draft, handlers } = useEditorPointer({
    svgRef,
    tool,
    beds,
    visiblePlaced,
    selectedBed,
    selectedPlaced,
    placedPlant,
    year,
    onSelect,
  })

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
          {...handlers}
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

          <ShadowLayer placed={visiblePlaced} bedById={bedById} plantById={plantById} />

          {visiblePlaced.map((p) => {
            const bed = bedById.get(p.bedId)
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
