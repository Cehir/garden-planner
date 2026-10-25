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
  editingSeed: Seed | null
  /** Pflanzenname des bearbeiteten Saatguts (Platzhalter für die Sorte) */
  editingPlantName: string
  onSave: () => void
  onCancel: () => void
  /** Nur beim Bearbeiten gesetzt */
  onDelete?: () => void
}

export default function SeedForm({
  draft,
  onChange,
  plants,
  editingSeed,
  editingPlantName,
  onSave,
  onCancel,
  onDelete,
}: SeedFormProps) {
  return (
    <div className="form">
      <h3>{editingSeed ? 'Saatgut bearbeiten' : 'Neues Saatgut'}</h3>
      <label>
        Pflanze
        <select
          value={draft.plantId}
          onChange={(e) => onChange({ plantId: e.target.value })}
          disabled={!!editingSeed}
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
          {editingSeed ? 'Speichern' : 'Hinzufügen'}
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
