import type { Rect } from './geometry'
import { HANDLES, HANDLE_SIZE, handlePos } from './geometry'

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
            stroke="#2f6f4f"
            strokeWidth={2}
            className="resize-handle"
          />
        )
      })}
    </>
  )
}
