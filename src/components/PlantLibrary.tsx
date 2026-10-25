import { useState, useMemo } from 'react'
import type { Plant } from '../types'
import { LIGHT_LABELS, SOIL_LABELS } from '../types'
import { canDoNow, currentMonth, formatRanges, MONTHS_SHORT } from '../seasons'
import { useStoreDispatch, useStoreState } from '../storeContext'
import { uid } from '../utils'
import SeedBank from './SeedBank'
import PlantForm from './plants/PlantForm'
import { LIGHT_ICONS, SOIL_ICONS } from './plants/PlantMeta'

// ─── PlantsPanel ────────────────────────────────────────────────────────

interface PlantsPanelProps {
  plantToPlace: Plant | null
  onPick: (plant: Plant | null) => void
}

function PlantsPanel({ plantToPlace, onPick }: PlantsPanelProps) {
  const state = useStoreState()
  const dispatch = useStoreDispatch()
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [nowOnly, setNowOnly] = useState(false)

  const month = currentMonth()
  const seedCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of state.seeds) {
      map.set(s.plantId, (map.get(s.plantId) ?? 0) + 1)
    }
    return map
  }, [state.seeds])

  const filtered = state.plants.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) &&
      (!nowOnly || canDoNow(p, month)),
  )

  return (
    <>
      <h2>Pflanzen-Bibliothek</h2>
      <input
        type="search"
        placeholder="Suchen…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <label className="now-filter">
        <input
          type="checkbox"
          checked={nowOnly}
          onChange={(e) => setNowOnly(e.target.checked)}
        />
        Jetzt pflanzbar ({MONTHS_SHORT[month - 1]})
      </label>
      <div className="plant-list">
        {filtered.map((p) => {
          const seedCount = seedCounts.get(p.id) ?? 0
          const active = plantToPlace?.id === p.id
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={
                'plant-item' + (editing === p.id ? ' editing' : '')
              }
              aria-pressed={active}
              aria-label={active ? `${p.name} — Auswahl aufheben` : `${p.name} — Platzieren`}
              title={active ? 'Auswahl aufheben' : 'Klicken, um zu platzieren'}
              onClick={(e) => {
                if ((e.target as Element).closest('[data-action="edit"]')) return
                onPick(active ? null : p)
              }}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPick(active ? null : p)
                }
              }}
            >
              <span className="emoji" style={{ background: p.color }}>
                {p.emoji}
              </span>
              <span className="name">
                {p.name}
                <span className="sub">
                  {p.spacing} cm · {LIGHT_ICONS[p.light ?? 'full']} {LIGHT_LABELS[p.light ?? 'full']} · {SOIL_ICONS[p.soil ?? 'normal']} {SOIL_LABELS[p.soil ?? 'normal']}
                </span>
                <span className="sub seasons">
                  🌱 {formatRanges(p.sow)} · 🪴 {formatRanges(p.plant)} · 🧺 {formatRanges(p.harvest)}
                </span>
                {seedCount > 0 && <span className="sub seeds">🌰 {seedCount}× Saatgut</span>}
              </span>
              <button
                type="button"
                className="mini"
                data-action="edit"
                title="Pflanze bearbeiten"
                aria-label={`${p.name} bearbeiten`}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(p.id)
                }}
              >
                ✏️
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && <p className="hint">Keine Pflanzen gefunden.</p>}
      </div>

      {editing && (
        <PlantForm
          plant={state.plants.find((p) => p.id === editing)}
          mode="edit"
          onSave={(data) => {
            const target = state.plants.find((p) => p.id === editing)
            if (!target) return
            dispatch({
              type: 'updatePlant',
              id: target.id,
              patch: {
                name: data.name.trim() || target.name,
                emoji: data.emoji,
                color: data.color,
                spacing: Math.max(1, data.spacing || target.spacing),
                height: Math.max(1, data.height || target.height),
                light: data.light,
                soil: data.soil,
                family: data.family,
                sow: data.sow,
                plant: data.plant,
                harvest: data.harvest,
              },
            })
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
          onDelete={() => {
            const target = state.plants.find((p) => p.id === editing)
            if (target) {
              dispatch({ type: 'removePlant', id: target.id })
              onPick(null)
            }
            setEditing(null)
          }}
        />
      )}

      {adding && (
        <PlantForm
          mode="add"
          onSave={(data) => {
            if (!data.name.trim()) return
            dispatch({
              type: 'addPlant',
              plant: {
                id: uid('plant'),
                ...data,
              },
            })
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {!adding && !editing && (
        <button type="button" className="tool wide" onClick={() => setAdding(true)}>
          ＋ Pflanze hinzufügen
        </button>
      )}

      {plantToPlace && (
        <p className="hint active-hint">
          „{plantToPlace.name}" ausgewählt – klicke in den Plan, um sie in ein Beet zu setzen.
        </p>
      )}
    </>
  )
}

// ─── PlantLibrary ───────────────────────────────────────────────────────

type Tab = 'plants' | 'seeds'

interface PlantLibraryProps {
  plantToPlace: Plant | null
  onPick: (plant: Plant | null) => void
}

export default function PlantLibrary(props: PlantLibraryProps) {
  const [tab, setTab] = useState<Tab>('plants')
  return (
    <aside className="sidebar library">
      <div className="tabs">
        <button
          type="button"
          className={tab === 'plants' ? 'tab active' : 'tab'}
          onClick={() => setTab('plants')}
        >
          Pflanzen
        </button>
        <button
          type="button"
          className={tab === 'seeds' ? 'tab active' : 'tab'}
          onClick={() => setTab('seeds')}
        >
          Samenbank
        </button>
      </div>
      {tab === 'plants' ? <PlantsPanel {...props} /> : <SeedBank />}
    </aside>
  )
}
