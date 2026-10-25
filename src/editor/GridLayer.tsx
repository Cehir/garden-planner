import { gridLines as buildGridLines, rulerLabels } from '../grid'
import { FRAME_COLOR } from '../palette'

// Gartenfläche, Raster und Lineal-Beschriftung (ab 0 alle RULER_LABEL_STEP cm)
export default function GridLayer({ width, height }: { width: number; height: number }) {
  const gridLines = buildGridLines(width, height)
  const ruler = rulerLabels(width, height)

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
      {ruler.top.map((x) => (
        <text
          key={`r${x}`}
          x={x}
          y={0}
          fill="#b3a892"
          fontSize={12}
          textAnchor="middle"
          dy={-4}
          pointerEvents="none"
        >
          {x}
        </text>
      ))}
      {ruler.left.map((y) => (
        <text
          key={`rb${y}`}
          x={0}
          y={y}
          fill="#b3a892"
          fontSize={12}
          dx={4}
          dy={4}
          pointerEvents="none"
        >
          {y}
        </text>
      ))}
    </>
  )
}
