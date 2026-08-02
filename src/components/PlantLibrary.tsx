import { useState } from 'react'
import type { Plant } from '../types'
import { useStore } from '../store'
import { uid } from '../utils'

const PLANT_COLORS = ['#3f7d43', '#7fb069', '#d6364c', '#e8822e', '#e8a30f', '#8a7bb8', '#d0527a', '#6fa3a8']

interface PlantLibraryProps {
  placedPlant: Plant | null
  onPick: (plant: Plant | null) => void
  tool: 'select' | 'bed' | 'plant'
}

export default function PlantLibrary({ placedPlant, onPick, tool }: PlantLibraryProps) {
  const { state, dispatch } = useStore()
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🌿')
  const [color, setColor] = useState(PLANT_COLORS[0])
  const [spacing, setSpacing] = useState(25)
  const [editing, setEditing] = useState<string | null>(null)

  const filtered = state.plants.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))

  function addPlant() {
    if (!name.trim()) return
    dispatch({
      type: 'addPlant',
      plant: { id: uid('plant'), name: name.trim(), emoji, color, spacing: Math.max(1, spacing || 25) },
    })
    setName('')
    setEmoji('🌿')
    setColor(PLANT_COLORS[0])
    setSpacing(25)
    setAdding(false)
  }

  return (
    <aside className="sidebar library">
      <h2>Pflanzen-Bibliothek</h2>
      <input
        type="search"
        placeholder="Suchen…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="plant-list">
        {filtered.map((p) => (
          <div
            key={p.id}
            className={
              'plant-item' +
              (placedPlant?.id === p.id ? ' active' : '') +
              (editing === p.id ? ' editing' : '')
            }
            onClick={() => onPick(placedPlant?.id === p.id ? null : p)}
            role="button"
            title={tool === 'plant' ? 'Klicken, um zu platzieren' : 'Wählen, dann oben „Pflanze platzieren“ aktivieren'}
          >
            <span className="emoji" style={{ background: p.color }}>
              {p.emoji}
            </span>
            <span className="name">
              {p.name}
              <span className="sub">{p.spacing} cm</span>
            </span>
            <button
              type="button"
              className="mini"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(p.id)
                setName(p.name)
                setEmoji(p.emoji)
                setColor(p.color)
                setSpacing(p.spacing)
              }}
            >
              ✏️
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="hint">Keine Pflanzen gefunden.</p>}
      </div>

      {editing &&
        (() => {
          const plant = state.plants.find((p) => p.id === editing)
          if (!plant) return null
          return (
            <div className="form">
              <h3>Pflanze bearbeiten</h3>
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Emoji
                <input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
              </label>
              <label>
                Farbe
                <div className="swatches">
                  {PLANT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={color === c ? 'swatch active' : 'swatch'}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </label>
              <label>
                Pflanzabstand (cm)
                <input
                  type="number"
                  min={1}
                  value={spacing}
                  onChange={(e) => setSpacing(Number(e.target.value))}
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    dispatch({
                      type: 'updatePlant',
                      id: plant.id,
                      patch: {
                        name: name.trim() || plant.name,
                        emoji,
                        color,
                        spacing: Math.max(1, spacing || plant.spacing),
                      },
                    })
                    setEditing(null)
                  }}
                >
                  Speichern
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    dispatch({ type: 'removePlant', id: plant.id })
                    onPick(null)
                    setEditing(null)
                  }}
                >
                  Löschen
                </button>
                <button type="button" className="tool" onClick={() => setEditing(null)}>
                  Abbrechen
                </button>
              </div>
            </div>
          )
        })()}

      {!editing &&
        (adding ? (
          <div className="form">
            <h3>Neue Pflanze</h3>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Mangold" />
            </label>
            <label>
              Emoji
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
            </label>
            <label>
              Farbe
              <div className="swatches">
                {PLANT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={color === c ? 'swatch active' : 'swatch'}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </label>
            <label>
              Pflanzabstand (cm)
              <input
                type="number"
                min={1}
                value={spacing}
                onChange={(e) => setSpacing(Number(e.target.value))}
              />
            </label>
            <div className="row">
              <button type="button" className="primary" onClick={addPlant}>
                Hinzufügen
              </button>
              <button type="button" className="tool" onClick={() => setAdding(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="tool wide" onClick={() => setAdding(true)}>
            ＋ Pflanze hinzufügen
          </button>
        ))}

      {placedPlant && (
        <p className="hint active-hint">
          „{placedPlant.name}“ ausgewählt – klicke in den Plan, um sie in ein Beet zu setzen.
        </p>
      )}
    </aside>
  )
}
