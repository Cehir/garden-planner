import type { MonthRange } from '../../types'
import { MONTH_OPTIONS } from './PlantMeta'

export function RangeField({
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

export function RangeListField({
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
