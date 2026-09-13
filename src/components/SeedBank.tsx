import { useMemo, useState } from 'react'
import type { Seed } from '../types'
import { useStore } from '../store'
import { uid } from '../utils'
import {
  daysUntil,
  expiryStatus,
  formatSeedDate,
  type ExpiryStatus,
} from '../seeds'
import { plantsById } from '../selectors'

const STATUS_RANK: Record<ExpiryStatus, number> = { expired: 0, soon: 1, ok: 2 }

export default function SeedBank() {
  const { state, dispatch } = useStore()
  const [filter, setFilter] = useState('')
  const [plantFilter, setPlantFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [plantId, setPlantId] = useState('')
  const [name, setName] = useState('')
  const [producer, setProducer] = useState('')
  const [filled, setFilled] = useState('')
  const [expires, setExpires] = useState('')

  const plantById = useMemo(() => plantsById(state.plants), [state.plants])

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const list = state.seeds.filter((s) => {
      if (plantFilter && s.plantId !== plantFilter) return false
      if (!needle) return true
      const plant = plantById.get(s.plantId)
      return (
        s.name.toLowerCase().includes(needle) ||
        s.producer.toLowerCase().includes(needle) ||
        (plant?.name.toLowerCase().includes(needle) ?? false)
      )
    })
    return [...list].sort((a, b) => {
      const ra = STATUS_RANK[expiryStatus(a)]
      const rb = STATUS_RANK[expiryStatus(b)]
      if (ra !== rb) return ra - rb
      return a.expires.localeCompare(b.expires)
    })
  }, [state.seeds, filter, plantFilter, plantById])

  const today = new Date()

  function badgeFor(seed: Seed): string | null {
    const status = expiryStatus(seed, today)
    if (status === 'expired') return '⚠️ abgelaufen'
    if (status === 'soon') {
      const d = daysUntil(seed, today)
      if (d === null) return '⏳ läuft bald ab'
      if (d === 0) return '⏳ läuft heute ab'
      return `⏳ läuft in ${d} Tag${d === 1 ? '' : 'en'} ab`
    }
    return null
  }

  function badgeClass(seed: Seed): string {
    const status = expiryStatus(seed, today)
    return status === 'expired' ? 'badge expired' : status === 'soon' ? 'badge soon' : 'badge ok'
  }

  function resetForm() {
    setPlantId('')
    setName('')
    setProducer('')
    setFilled('')
    setExpires('')
  }

  function startAdd() {
    resetForm()
    setPlantId(plantFilter)
    setEditing(null)
    setAdding(true)
  }

  function startEdit(seed: Seed) {
    setPlantId(seed.plantId)
    setName(seed.name)
    setProducer(seed.producer)
    setFilled(seed.filled)
    setExpires(seed.expires)
    setAdding(false)
    setEditing(seed.id)
  }

  function save() {
    if (!plantId) return
    const patch = {
      plantId,
      name: name.trim(),
      producer: producer.trim(),
      filled: filled.trim(),
      expires: expires.trim(),
    }
    if (editing) {
      dispatch({ type: 'updateSeed', id: editing, patch })
      setEditing(null)
    } else {
      dispatch({ type: 'addSeed', seed: { id: uid('seed'), ...patch } })
    }
    resetForm()
    setAdding(false)
  }

  return (
    <div className="seedbank">
      <h2>Samenbank</h2>
      <div className="seed-tools">
        <input
          type="search"
          placeholder="Suchen…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select value={plantFilter} onChange={(e) => setPlantFilter(e.target.value)}>
          <option value="">Alle Pflanzen</option>
          {state.plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji} {p.name}
            </option>
          ))}
        </select>
      </div>
      <p className="hint">{filtered.length} Saatgut</p>

      <div className="seed-list">
        {filtered.map((s) => {
          const plant = plantById.get(s.plantId)
          const badge = badgeFor(s)
          return (
            <div key={s.id} className={editing === s.id ? 'seed-item editing' : 'seed-item'}>
              <div className="seed-head">
                <span className="emoji" style={{ background: plant?.color ?? '#ddd' }}>
                  {plant?.emoji ?? '❓'}
                </span>
                <span className="name">
                  {s.name || plant?.name || 'Unbekannt'}
                  <span className="sub">{plant?.name ?? 'Unbekannte Pflanze'}</span>
                </span>
                <button
                  type="button"
                  className="mini"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEdit(s)
                  }}
                >
                  ✏️
                </button>
              </div>
              {s.producer && (
                <span className="sub producer">🏭 {s.producer}</span>
              )}
              <span className="sub dates">
                Abgefüllt: {formatSeedDate(s.filled)} · Haltbar bis: {formatSeedDate(s.expires)}
              </span>
              {badge && <span className={badgeClass(s)}>{badge}</span>}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="hint">Kein Saatgut gefunden.</p>}
      </div>

      {(adding || editing) &&
        (() => {
          const target = editing ? state.seeds.find((s) => s.id === editing) : null
          if (editing && !target) return null
          return (
            <div className="form">
              <h3>{editing ? 'Saatgut bearbeiten' : 'Neues Saatgut'}</h3>
              <label>
                Pflanze
                <select
                  value={plantId}
                  onChange={(e) => setPlantId(e.target.value)}
                  disabled={!!target}
                >
                  <option value="">– Pflanze wählen –</option>
                  {state.plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sorte / Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`z.B. ${target ? plantById.get(target.plantId)?.name ?? '' : ''}`}
                />
              </label>
              <label>
                Hersteller
                <input value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="z.B. Dehner, Quedlinburg…" />
              </label>
              <label>
                Abfülldatum
                <input type="date" value={filled} onChange={(e) => setFilled(e.target.value)} />
              </label>
              <label>
                Haltbarkeitsdatum
                <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
              </label>
              <div className="row">
                <button type="button" className="primary" onClick={save} disabled={!plantId}>
                  {editing ? 'Speichern' : 'Hinzufügen'}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      dispatch({ type: 'removeSeed', id: editing })
                      setEditing(null)
                      resetForm()
                    }}
                  >
                    Löschen
                  </button>
                )}
                <button
                  type="button"
                  className="tool"
                  onClick={() => {
                    setAdding(false)
                    setEditing(null)
                    resetForm()
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )
        })()}

      {!adding && !editing && (
        <button type="button" className="tool wide" onClick={startAdd}>
          ＋ Saatgut hinzufügen
        </button>
      )}
    </div>
  )
}