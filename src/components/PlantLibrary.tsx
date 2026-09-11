import { useState, useMemo } from 'react'
import type { LightRequirement, MonthRange, Plant, PlantFamily, SoilType } from '../types'
import { FAMILY_LABELS, LIGHT_LABELS, SOIL_LABELS } from '../types'
import { canDoNow, currentMonth, formatRanges, MONTHS_SHORT } from '../seasons'
import { useStore } from '../store'
import { uid } from '../utils'
import SeedBank from './SeedBank'

const PLANT_COLORS = ['#3f7d43', '#7fb069', '#d6364c', '#e8822e', '#e8a30f', '#8a7bb8', '#d0527a', '#6fa3a8']

const LIGHT_ICONS: Record<LightRequirement, string> = {
  full: '☀️',
  partial: '⛅',
  shade: '☁️',
}

const SOIL_ICONS: Record<SoilType, string> = {
  humus: '🍂',
  sand: '🏖️',
  loam: '🟫',
  clay: '🟤',
  normal: '🌱',
}

const MONTH_OPTIONS = MONTHS_SHORT.map((label, i) => ({ value: i + 1, label }))

function RangeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: MonthRange
  onChange: (v: MonthRange) => void
}) {
  const isYearSpanning = value[0] > value[1]
  return (
    <label>
      {label}
      <span className="range-row">
        <select
          value={value[0]}
          onChange={(e) => onChange([Number(e.target.value), value[1]])}
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="range-sep">bis</span>
        <select
          value={value[1]}
          onChange={(e) => onChange([value[0], Number(e.target.value)])}
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {isYearSpanning && (
          <span className="year-span-indicator" title="Jahresübergreifend">
            ↕
          </span>
        )}
      </span>
    </label>
  )
}

function RangeListField({
  label,
  values,
  onChange,
}: {
  label: string
  values: MonthRange[]
  onChange: (v: MonthRange[]) => void
}) {
  return (
    <div className="range-list">
      <span className="range-list-label">{label}</span>
      {values.map((range, i) => (
        <div key={i} className="range-list-row">
          <RangeField
            label={i === 0 ? '' : `${label}#${i + 1}`}
            value={range}
            onChange={(next) => {
              const copy = values.slice()
              copy[i] = next
              onChange(copy)
            }}
          />
          <button
            type="button"
            className="mini"
            title="Fenster entfernen"
            onClick={() => {
              if (values.length <= 1) return
              onChange(values.filter((_, idx) => idx !== i))
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="tool" onClick={() => onChange([...values, [3, 6]])}>
        ＋ {label} hinzufügen
      </button>
    </div>
  )
}

// ─── PlantForm ───────────────────────────────────────────────────────────

interface PlantFormData {
  name: string
  emoji: string
  color: string
  spacing: number
  height: number
  light: LightRequirement
  soil: SoilType
  family: PlantFamily
  sow: MonthRange[]
  plant: MonthRange[]
  harvest: MonthRange[]
}

const DEFAULT_FORM: PlantFormData = {
  name: '',
  emoji: '🌿',
  color: PLANT_COLORS[0],
  spacing: 25,
  height: 25,
  light: 'full',
  soil: 'normal',
  family: 'andere',
  sow: [[3, 6]],
  plant: [[3, 6]],
  harvest: [[6, 9]],
}

function initForm(plant?: Plant): PlantFormData {
  if (plant) {
    return {
      name: plant.name,
      emoji: plant.emoji,
      color: plant.color,
      spacing: plant.spacing,
      height: plant.height,
      light: plant.light,
      soil: plant.soil,
      family: plant.family,
      sow: plant.sow.slice(),
      plant: plant.plant.slice(),
      harvest: plant.harvest.slice(),
    }
  }
  return { ...DEFAULT_FORM }
}

interface PlantFormProps {
  plant?: Plant
  onSave: (data: PlantFormData) => void
  onCancel: () => void
  onDelete?: () => void
  mode: 'add' | 'edit'
}

function PlantForm({ plant, onSave, onCancel, onDelete, mode }: PlantFormProps) {
  const [form, setForm] = useState<PlantFormData>(() => initForm(plant))
  const isAdd = mode === 'add'

  const set = <K extends keyof PlantFormData>(k: K, v: PlantFormData[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="form">
      <h3>{isAdd ? 'Neue Pflanze' : 'Pflanze bearbeiten'}</h3>

      <label>
        Name
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={isAdd ? 'z.B. Mangold' : undefined}
        />
      </label>

      <label>
        Emoji
        <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} />
      </label>

      <label>
        Farbe
        <div className="swatches">
          {PLANT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={form.color === c ? 'swatch active' : 'swatch'}
              style={{ background: c }}
              onClick={() => set('color', c)}
            />
          ))}
        </div>
      </label>

      <label>
        Pflanzabstand (cm)
        <input
          type="number"
          min={1}
          value={form.spacing}
          onChange={(e) => set('spacing', Number(e.target.value))}
        />
      </label>

      <label>
        Höhe (cm)
        <input
          type="number"
          min={1}
          value={form.height}
          onChange={(e) => set('height', Number(e.target.value))}
        />
      </label>

      <label>
        Lichtbedarf
        <select value={form.light} onChange={(e) => set('light', e.target.value as LightRequirement)}>
          {(Object.keys(LIGHT_LABELS) as LightRequirement[]).map((k) => (
            <option key={k} value={k}>
              {LIGHT_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Empfohlener Bodentyp
        <select value={form.soil} onChange={(e) => set('soil', e.target.value as SoilType)}>
          {(Object.keys(SOIL_LABELS) as SoilType[]).map((k) => (
            <option key={k} value={k}>
              {SOIL_ICONS[k]} {SOIL_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Pflanzenfamilie
        <select value={form.family} onChange={(e) => set('family', e.target.value as PlantFamily)}>
          {(Object.keys(FAMILY_LABELS) as PlantFamily[]).map((k) => (
            <option key={k} value={k}>
              {FAMILY_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <RangeListField label="Aussaat" values={form.sow} onChange={(v) => set('sow', v)} />
      <RangeListField label="Pflanzung" values={form.plant} onChange={(v) => set('plant', v)} />
      <RangeListField label="Ernte" values={form.harvest} onChange={(v) => set('harvest', v)} />

      <div className="row">
        <button type="button" className="primary" onClick={() => onSave(form)}>
          {isAdd ? 'Hinzufügen' : 'Speichern'}
        </button>
        {onDelete && (
          <button type="button" className="danger" onClick={onDelete}>
            Löschen
          </button>
        )}
        <button type="button" className="tool" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}

// ─── PlantsPanel ────────────────────────────────────────────────────────

interface PlantsPanelProps {
  placedPlant: Plant | null
  onPick: (plant: Plant | null) => void
  tool: 'select' | 'bed' | 'plant'
}

function PlantsPanel({ placedPlant, onPick }: PlantsPanelProps) {
  const { state, dispatch } = useStore()
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
          const active = placedPlant?.id === p.id
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

      {placedPlant && (
        <p className="hint active-hint">
          „{placedPlant.name}" ausgewählt – klicke in den Plan, um sie in ein Beet zu setzen.
        </p>
      )}
    </>
  )
}

// ─── PlantLibrary ───────────────────────────────────────────────────────

type Tab = 'plants' | 'seeds'

interface PlantLibraryProps {
  placedPlant: Plant | null
  onPick: (plant: Plant | null) => void
  tool: 'select' | 'bed' | 'plant'
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
