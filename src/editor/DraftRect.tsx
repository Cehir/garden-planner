import type { Rect } from './geometry'
import { DEFAULT_BED_COLOR } from '../palette'

// Vorschau des Beets, das gerade aufgezogen wird
export default function DraftRect({ rect }: { rect: Rect }) {
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.w}
      height={rect.h}
      fill={DEFAULT_BED_COLOR}
      fillOpacity={0.25}
      stroke="#2f6f4f"
      strokeWidth={2}
      strokeDasharray="6 4"
    />
  )
}
