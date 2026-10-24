import type { Bed } from '../types'
import { ACCENT_COLOR } from '../palette'

// Ein Beet mit Namen; ausgewählt kräftiger umrandet

export default function BedShape({ bed, selected }: { bed: Bed; selected: boolean }) {
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
        stroke={selected ? ACCENT_COLOR : bed.color}
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
