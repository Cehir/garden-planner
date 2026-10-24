import { gridLines as buildGridLines } from '../grid'
import { FRAME_COLOR } from '../palette'

// Gartenfläche, Raster und Lineal-Beschriftung (alle 100 cm)
export default function GridLayer({ width, height }: { width: number; height: number }) {
  const gridLines = buildGridLines(width, height)

  const topLabels: { x: number; label: string }[] = []
  for (let x = 100; x <= width; x += 100) {
    topLabels.push({ x, label: `${x}` })
  }
  const leftLabels: { y: number; label: string }[] = []
  for (let y = 100; y <= height; y += 100) {
    leftLabels.push({ y, label: `${y}` })
  }

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
      {topLabels.map((l, i) => (
        <text
          key={`r${i}`}
          x={l.x}
          y={0}
          fill="#b3a892"
          fontSize={12}
          textAnchor="middle"
          dy={-4}
          pointerEvents="none"
        >
          {l.label}
        </text>
      ))}
      {leftLabels.map((l, i) => (
        <text
          key={`rb${i}`}
          x={0}
          y={l.y}
          fill="#b3a892"
          fontSize={12}
          dx={4}
          dy={4}
          pointerEvents="none"
        >
          {l.label}
        </text>
      ))}
    </>
  )
}
