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
            label={i === 0 ? '' : `${label} #${i + 1}`}
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

interface PlantsPanelProps {
  placedPlant: Plant | null
  onPick: (plant: Plant | null) => void
  tool: 'select' | 'bed' | 'plant'
}

function PlantsPanel({ placedPlant, onPick }: PlantsPanelProps) {
  const { state, dispatch } = useStore()
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🌿')
  const [color, setColor] = useState(PLANT_COLORS[0])
  const [spacing, setSpacing] = useState(25)
  const [height, setHeight] = useState(25)
  const [light, setLight] = useState<LightRequirement>('full')
  const [soil, setSoil] = useState<SoilType>('normal')
  const [family, setFamily] = useState<PlantFamily>('andere')
  const [sow, setSow] = useState<MonthRange[]>([[3, 6]])
  const [plant, setPlant] = useState<MonthRange[]>([[3, 6]])
  const [harvest, setHarvest] = useState<MonthRange[]>([[6, 9]])
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

  function addPlant() {
    if (!name.trim()) return
    dispatch({
      type: 'addPlant',
      plant: {
        id: uid('plant'),
        name: name.trim(),
        emoji,
        color,
        spacing: Math.max(1, spacing || 25),
        height: Math.max(1, height || 25),
        light,
        soil,
        family,
        sow,
        plant,
        harvest,
      },
    })
    setName('')
    setEmoji('🌿')
    setColor(PLANT_COLORS[0])
    setSpacing(25)
    setHeight(25)
    setLight('full')
    setSoil('normal')
    setFamily('andere')
    setSow([[3, 6]])
    setPlant([[3, 6]])
    setHarvest([[6, 9]])
    setAdding(false)
  }

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
          return (
            <button
              key={p.id}
              type="button"
              className={
                'plant-item' +
                (placedPlant?.id === p.id ? ' active' : '') +
                (editing === p.id ? ' editing' : '')
              }
              onClick={() => onPick(placedPlant?.id === p.id ? null : p)}
              aria-label={placedPlant?.id === p.id ? `${p.name} — Auswahl aufheben` : `${p.name} — Platzieren`}
              title={placedPlant?.id === p.id ? 'Auswahl aufheben' : 'Klicken, um zu platzieren'}
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
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(p.id)
                  setName(p.name)
                  setEmoji(p.emoji)
                  setColor(p.color)
                  setSpacing(p.spacing)
                  setHeight(p.height)
                  setLight(p.light)
                  setSoil(p.soil)
                  setFamily(p.family)
                  setSow(p.sow.slice())
                  setPlant(p.plant.slice())
                  setHarvest(p.harvest.slice())
                }}
              >
                ✏️
              </button>
            </button>
          )
        })}
        {filtered.length === 0 && <p className="hint">Keine Pflanzen gefunden.</p>}
      </div>

      {editing &&
        (() => {
          const target = state.plants.find((p) => p.id === editing)
          if (!target) return null
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
              <label>
                Höhe (cm)
                <input
                  type="number"
                  min={1}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                />
              </label>
              <label>
                Lichtbedarf
                <select value={light} onChange={(e) => setLight(e.target.value as LightRequirement)}>
                  {(Object.keys(LIGHT_LABELS) as LightRequirement[]).map((k) => (
                    <option key={k} value={k}>
                      {LIGHT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Empfohlener Bodentyp
                <select value={soil} onChange={(e) => setSoil(e.target.value as SoilType)}>
                  {(Object.keys(SOIL_LABELS) as SoilType[]).map((k) => (
                    <option key={k} value={k}>
                      {SOIL_ICONS[k]} {SOIL_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pflanzenfamilie
                <select value={family} onChange={(e) => setFamily(e.target.value as PlantFamily)}>
                  {(Object.keys(FAMILY_LABELS) as PlantFamily[]).map((k) => (
                    <option key={k} value={k}>
                      {FAMILY_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <RangeListField label="Aussaat" values={sow} onChange={setSow} />
              <RangeListField label="Pflanzung" values={plant} onChange={setPlant} />
              <RangeListField label="Ernte" values={harvest} onChange={setHarvest} />
              <div className="row">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    dispatch({
                      type: 'updatePlant',
                      id: target.id,
                      patch: {
                        name: name.trim() || target.name,
                        emoji,
                        color,
                        spacing: Math.max(1, spacing || target.spacing),
                        height: Math.max(1, height || target.height),
                        light,
                        soil,
                        family,
                        sow,
                        plant,
                        harvest,
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
                    dispatch({ type: 'removePlant', id: target.id })
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
            <label>
              Höhe (cm)
              <input
                type="number"
                min={1}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </label>
            <label>
              Lichtbedarf
              <select value={light} onChange={(e) => setLight(e.target.value as LightRequirement)}>
                {(Object.keys(LIGHT_LABELS) as LightRequirement[]).map((k) => (
                  <option key={k} value={k}>
                    {LIGHT_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Empfohlener Bodentyp
              <select value={soil} onChange={(e) => setSoil(e.target.value as SoilType)}>
                {(Object.keys(SOIL_LABELS) as SoilType[]).map((k) => (
                  <option key={k} value={k}>
                    {SOIL_ICONS[k]} {SOIL_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pflanzenfamilie
              <select value={family} onChange={(e) => setFamily(e.target.value as PlantFamily)}>
                {(Object.keys(FAMILY_LABELS) as PlantFamily[]).map((k) => (
                  <option key={k} value={k}>
                    {FAMILY_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <RangeListField label="Aussaat" values={sow} onChange={setSow} />
            <RangeListField label="Pflanzung" values={plant} onChange={setPlant} />
            <RangeListField label="Ernte" values={harvest} onChange={setHarvest} />
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
    </>
  )
}

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