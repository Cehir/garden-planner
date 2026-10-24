import type { Bed, PlacedPlant, Plant } from '../types'
import { shadowPolygon } from '../shadow'

interface ShadowLayerProps {
  placed: PlacedPlant[]
  bedById: Map<string, Bed>
  plantById: Map<string, Plant>
}

// Schattenwurf der sichtbaren Pflanzen (Sonne aus Süden)
export default function ShadowLayer({ placed, bedById, plantById }: ShadowLayerProps) {
  return (
    <>
      {placed.map((p) => {
        const bed = bedById.get(p.bedId)
        if (!bed) return null
        const plant = plantById.get(p.plantId)
        const shape = plant ? shadowPolygon(plant, p, bed) : null
        if (!shape) return null
        return (
          <polygon
            key={`sh-${p.id}`}
            points={shape.polygon.map((pt) => pt.join(',')).join(' ')}
            fill="#3a362e"
            fillOpacity={0.12}
            pointerEvents="none"
          />
        )
      })}
    </>
  )
}
