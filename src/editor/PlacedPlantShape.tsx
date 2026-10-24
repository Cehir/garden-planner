import type { Bed, PlacedPlant, Plant } from '../types'
import { placedCenter } from '../selectors'
import { HANDLE_SIZE } from './geometry'

interface PlacedPlantShapeProps {
  placed: PlacedPlant
  plant: Plant | undefined
  bed: Bed
  selected: boolean
  // Passt die Pflanze zur gewählten Saison? null = kein Saisonfilter
  inSeason: boolean | null
  conflicted: boolean
  showRotation: boolean
}

// Eine gesetzte Pflanze mit Saison-Markierung, Größen-Anfasser, Konfliktwarnung und Pflanzjahr
export default function PlacedPlantShape({
  placed,
  plant,
  bed,
  selected,
  inSeason,
  conflicted,
  showRotation,
}: PlacedPlantShapeProps) {
  const { x: cx, y: cy } = placedCenter(placed, bed)
  const r = placed.size / 2
  return (
    <g
      className={selected ? 'plant selected' : 'plant'}
      style={{ opacity: inSeason === false ? 0.3 : 1 }}
    >
      {inSeason === true && (
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
        r={r + (selected ? 3 : 0)}
        fill={plant?.color ?? '#999'}
        fillOpacity={0.35}
        stroke={plant?.color ?? '#999'}
        strokeWidth={selected ? 3 : 1.5}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={placed.size * 0.8}
        pointerEvents="none"
      >
        {plant?.emoji ?? '❓'}
      </text>
      {selected && (
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
      {conflicted && (
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
          {placed.plantedYear}
        </text>
      )}
    </g>
  )
}
