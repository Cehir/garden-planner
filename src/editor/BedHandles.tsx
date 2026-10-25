import type { Handle, Rect } from './geometry'
import { HANDLES, HANDLE_SIZE, handlePos } from './geometry'
import { ACCENT_COLOR } from '../palette'

// Himmelsrichtung je Anfasser (Norden ist oben, siehe Kompass)
const HANDLE_LABELS: Record<Handle, string> = {
  nw: 'Nordwest',
  n: 'Nord',
  ne: 'Nordost',
  e: 'Ost',
  se: 'Südost',
  s: 'Süd',
  sw: 'Südwest',
  w: 'West',
}

// Die acht Größen-Anfasser des ausgewählten Beets
export default function BedHandles({ rect }: { rect: Rect }) {
  return (
    <>
      {HANDLES.map((h) => {
        const p = handlePos(rect, h)
        return (
          <rect
            key={h}
            x={p.x - HANDLE_SIZE / 2}
            y={p.y - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#fff"
            stroke={ACCENT_COLOR}
            strokeWidth={2}
            className="resize-handle"
            role="img"
            aria-label={`Beetgröße ändern: ${HANDLE_LABELS[h]}`}
          />
        )
      })}
    </>
  )
}
