import { useStoreDispatch, useStoreState } from '../../storeContext'
import Diary from '../Diary'

export type GardenTab = 'garden' | 'diary'

interface GardenPanelProps {
  activeTab: GardenTab
  onTabChange: (tab: GardenTab) => void
}

export default function GardenPanel({ activeTab, onTabChange }: GardenPanelProps) {
  const { garden } = useStoreState()
  const dispatch = useStoreDispatch()

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          type="button"
          className={activeTab === 'garden' ? 'sidebar-tab active' : 'sidebar-tab'}
          onClick={() => onTabChange('garden')}
        >
          🏡 Garten
        </button>
        <button
          type="button"
          className={activeTab === 'diary' ? 'sidebar-tab active' : 'sidebar-tab'}
          onClick={() => onTabChange('diary')}
        >
          📅 Tagebuch
        </button>
      </div>
      {activeTab === 'garden' ? (
        <>
          <h2>Garten</h2>
          <label>
            Name
            <input
              value={garden.name}
              onChange={(e) => dispatch({ type: 'setGarden', patch: { name: e.target.value } })}
            />
          </label>
          <label>
            Breite (cm)
            <input
              type="number"
              min={100}
              value={garden.width}
              onChange={(e) => dispatch({ type: 'setGarden', patch: { width: Math.max(100, Number(e.target.value) || 100) } })}
            />
          </label>
          <label>
            Höhe (cm)
            <input
              type="number"
              min={100}
              value={garden.height}
              onChange={(e) => dispatch({ type: 'setGarden', patch: { height: Math.max(100, Number(e.target.value) || 100) } })}
            />
          </label>
          <p className="hint">
            Wähle oben „▭ Beet zeichnen" und ziehe mit der Maus ein Rechteck auf.
          </p>
          <p className="hint">
            Mit „🌱 Pflanze platzieren" klickst du zuerst in der Bibliothek eine Pflanze an und setzt
            sie danach in ein Beet.
          </p>
        </>
      ) : (
        <Diary />
      )}
    </aside>
  )
}
