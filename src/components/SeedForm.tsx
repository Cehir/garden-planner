import type { Plant, Seed } from '../types'

/** Eingaben des Saatgut-Formulars (noch ungetrimmt). */
export interface SeedDraft {
  plantId: string
  name: string
  producer: string
  filled: string
  expires: string
}

interface SeedFormProps {
  draft: SeedDraft
  onChange: (patch: Partial<SeedDraft>) => void
  plants: Plant[]
  /** Das bearbeitete Saatgut; null beim Hinzufügen */
  editing: Seed | null
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}

export default function SeedForm({ draft, onChange, plants, editing, onSave, onCancel, onDelete }: SeedFormProps) {
  const editingPlantName = editing ? plants.find((p) => p.id === editing.plantId)?.name ?? '' : ''

  return (
    <div className="form">
      <h3>{editing ? 'Saatgut bearbeiten' : 'Neues Saatgut'}</h3>
      <label>
        Pflanze
        <select
          value={draft.plantId}
          onChange={(e) => onChange({ plantId: e.target.value })}
          disabled={!!editing}
        >
          <option value="">– Pflanze wählen –</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji} {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sorte / Name
        <input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`z.B. ${editingPlantName}`}
        />
      </label>
      <label>
        Hersteller
        <input value={draft.producer} onChange={(e) => onChange({ producer: e.target.value })} placeholder="z.B. Dehner, Quedlinburg…" />
      </label>
      <label>
        Abfülldatum
        <input type="date" value={draft.filled} onChange={(e) => onChange({ filled: e.target.value })} />
      </label>
      <label>
        Haltbarkeitsdatum
        <input type="date" value={draft.expires} onChange={(e) => onChange({ expires: e.target.value })} />
      </label>
      <div className="row">
        <button type="button" className="primary" onClick={onSave} disabled={!draft.plantId}>
          {editing ? 'Speichern' : 'Hinzufügen'}
        </button>
        {editing && (
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
