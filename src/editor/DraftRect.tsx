import type { Rect } from './geometry'
import { ACCENT_COLOR, DEFAULT_BED_COLOR } from '../palette'

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
      stroke={ACCENT_COLOR}
      strokeWidth={2}
      strokeDasharray="6 4"
    />
  )
}
