import type { BedStatsResult } from '../../bedStats'

interface BedStatsProps {
  stats: BedStatsResult
  year: number
}

/** Kennzahlen, Fruchtfolge und Beschattung eines Beets. */
export default function BedStats({ stats, year }: BedStatsProps) {
  const { bedPlants, utilization, cycle, rotation, conflicts } = stats

  return (
    <>
      <div className="stats">
        <div>
          <strong>{bedPlants.length}</strong> Pflanzen · Jahr {year}
        </div>
        <div>
          <strong>{utilization}%</strong> belegt
        </div>
      </div>

      {cycle && (
        <p className="hint">
          🔁 Fruchtfolge: {cycle.min} → {cycle.max} · {cycle.max - cycle.min + 1} Jahr(e)
        </p>
      )}

      {rotation.length > 0 && (
        <div className="conflicts">
          <h3>🔁 Fruchtfolge-Warnungen</h3>
          <ul>
            {rotation.map((w, i) => (
              <li key={i}>{w.text}</li>
            ))}
          </ul>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="conflicts">
          <h3>⚠️ Beschattungs-Warnungen</h3>
          <ul>
            {conflicts.map((c) => (
              <li key={`${c.sourceId}-${c.targetId}`}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
