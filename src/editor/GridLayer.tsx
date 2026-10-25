import { useMemo } from 'react'
import { gridLines as buildGridLines, RULER_FONT_SIZE, rulerLabels } from '../grid'
import { FRAME_COLOR, RULER_COLOR } from '../palette'

// Gartenfläche, Raster und Lineal-Beschriftung (Ecke 0, dann alle 100 cm)
export default function GridLayer({ width, height }: { width: number; height: number }) {
  const gridLines = useMemo(() => buildGridLines(width, height), [width, height])
  const ruler = useMemo(() => rulerLabels(width, height), [width, height])

  return (
    <>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#fdfbf5"
        stroke={FRAME_COLOR}
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
      {ruler.map((l) => (
        <text
          key={`${l.edge}${l.value}`}
          x={l.x}
          y={l.y}
          fill={RULER_COLOR}
          fontSize={RULER_FONT_SIZE}
          textAnchor={l.anchor}
          dx={l.dx}
          dy={l.dy}
          pointerEvents="none"
        >
          {l.value}
        </text>
      ))}
    </>
  )
}
