import { useMemo, useState } from 'react'
import type { Seed } from '../types'
import { useStoreDispatch, useStoreState } from '../storeContext'
import { uid } from '../utils'
import {
  expiryStatus,
  formatSeedDate,
  seedBadge,
  type ExpiryStatus,
} from '../seeds'
import { plantsById } from '../selectors'
import SeedForm from './SeedForm'
import type { SeedDraft } from './SeedForm'

const STATUS_RANK: Record<ExpiryStatus, number> = { expired: 0, soon: 1, ok: 2 }

const EMPTY_DRAFT: SeedDraft = { plantId: '', name: '', producer: '', filled: '', expires: '' }

export default function SeedBank() {
  const state = useStoreState()
  const dispatch = useStoreDispatch()
  const [filter, setFilter] = useState('')
  const [plantFilter, setPlantFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<SeedDraft>(EMPTY_DRAFT)

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
  const editingSeed = editing ? state.seeds.find((s) => s.id === editing) ?? null : null
  // Verschwundenes Saatgut (z. B. per Rückgängig) schließt das Bearbeiten-Formular
  const showForm = editing ? editingSeed !== null : adding

  function resetForm() {
    setDraft(EMPTY_DRAFT)
  }

  function startAdd() {
    setDraft({ ...EMPTY_DRAFT, plantId: plantFilter })
    setEditing(null)
    setAdding(true)
  }

  function startEdit(seed: Seed) {
    const { plantId, name, producer, filled, expires } = seed
    setDraft({ plantId, name, producer, filled, expires })
    setAdding(false)
    setEditing(seed.id)
  }

  function save() {
    if (!draft.plantId) return
    const patch = {
      plantId: draft.plantId,
      name: draft.name.trim(),
      producer: draft.producer.trim(),
      filled: draft.filled.trim(),
      expires: draft.expires.trim(),
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
          const badge = seedBadge(s, today)
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
              {badge && <span className={badge.className}>{badge.text}</span>}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="hint">Kein Saatgut gefunden.</p>}
      </div>

      {showForm && (
        <SeedForm
          draft={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          plants={state.plants}
          editingSeed={editingSeed}
          editingPlantName={editingSeed ? plantById.get(editingSeed.plantId)?.name ?? '' : ''}
          onSave={save}
          onCancel={() => {
            setAdding(false)
            setEditing(null)
            resetForm()
          }}
          onDelete={
            editingSeed
              ? () => {
                  dispatch({ type: 'removeSeed', id: editingSeed.id })
                  setEditing(null)
                  resetForm()
                }
              : undefined
          }
        />
      )}

      {!adding && !editing && (
        <button type="button" className="tool wide" onClick={startAdd}>
          ＋ Saatgut hinzufügen
        </button>
      )}
    </div>
  )
}