import { useState } from 'react'
import type { Selected } from '../types'
import { useStoreState } from '../storeContext'
import PlacedPlantPanel from './bed/PlacedPlantPanel'
import GardenPanel from './bed/GardenPanel'
import type { GardenTab } from './bed/GardenPanel'
import BedPanel from './bed/BedPanel'

interface BedDetailsProps {
  selected: Selected | null
  onClearSelection: () => void
  year: number
}

/** Wählt je nach Auswahl die passende Detail-Leiste: Pflanze, Beet oder Garten. */
export default function BedDetails({ selected, onClearSelection, year }: BedDetailsProps) {
  const { beds } = useStoreState()
  // Hier statt im GardenPanel, damit der Tab eine Beet-Auswahl übersteht
  const [activeTab, setActiveTab] = useState<GardenTab>('garden')

  if (selected?.kind === 'placed') return <PlacedPlantPanel placedId={selected.id} />

  const bed = selected?.kind === 'bed' ? beds.find((b) => b.id === selected.id) : null
  if (!bed) return <GardenPanel activeTab={activeTab} onTabChange={setActiveTab} />

  return <BedPanel bed={bed} year={year} onClearSelection={onClearSelection} />
}
