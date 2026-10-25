import { useState } from 'react'
import type { LightRequirement, MonthRange, Plant, PlantFamily, SoilType } from '../../types'
import { FAMILY_LABELS, LIGHT_LABELS, SOIL_LABELS } from '../../types'
import { PLANT_COLORS } from '../../palette'
import { SOIL_ICONS } from './PlantMeta'
import { RangeListField } from './RangeFields'

export interface PlantFormData {
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

export default function PlantForm({ plant, onSave, onCancel, onDelete, mode }: PlantFormProps) {
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
