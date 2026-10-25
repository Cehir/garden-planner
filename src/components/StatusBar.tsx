import type { Plant, Tool } from '../types'
import { isMac } from '../utils/platform'

interface Props {
  tool: Tool
  plantToPlace: Plant | null
}

export default function StatusBar({ tool, plantToPlace }: Props) {
  return (
    <footer className="statusbar">
      {tool === 'bed' && <span>Ziehe mit der Maus, um ein Beet aufzuzeichnen.</span>}
      {tool === 'plant' &&
        (plantToPlace
          ? <span>Klicke in ein Beet, um „{plantToPlace.name}“ zu platzieren.</span>
          : <span>Wähle links in der Bibliothek eine Pflanze aus.</span>)}
      {tool === 'select' && <span>Auswählen &amp; Verschieben · Beete an den Ecken skalieren · Entf zum Löschen.</span>}
      <span className="keys">Tasten: V · B · P · F · Esc · {isMac ? '⌘Z' : 'Ctrl+Z'} · {isMac ? '⇧⌘Z' : 'Shift+Ctrl+Z'}</span>
    </footer>
  )
}
