import type { AppState, Phase, Season } from './types'
import { placedInYear } from './utils'
import { phaseMatchesSeason } from './seasons'
import { expiryStatus, EXPIRY_BADGES, formatSeedDate } from './seeds'
import { plantsById, placedCenter } from './selectors'
import { gridLines } from './grid'

const SNAP = 10

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface PrintLegendItem {
  id: string
  emoji: string
  name: string
  spacing: number
}

export interface PrintOptions {
  year: number
  season: Season
  phase: Phase
}

export interface PrintSize {
  width: number
  height: number
}

/** Eindeutige Pflanzenarten, die im gewählten Jahr in den Beeten liegen (für die Legende). */
export function buildPrintLegend(state: AppState, year: number): PrintLegendItem[] {
  const placed = placedInYear(state.placedPlants, year)
  const byId = plantsById(state.plants)
  const seen = new Set<string>()
  const items: PrintLegendItem[] = []
  for (const p of placed) {
    const plant = byId.get(p.plantId)
    if (!plant || seen.has(p.plantId)) continue
    seen.add(p.plantId)
    items.push({ id: plant.id, emoji: plant.emoji, name: plant.name, spacing: plant.spacing })
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/** Druck-Plan: Garten-Rahmen, Grid, Maßlabels, Beete und Pflanzen des gewählten Jahres. */
export function buildPrintSvg(state: AppState, opts: PrintOptions, size?: PrintSize): string {
  const { garden, beds, plants } = state
  const placed = placedInYear(state.placedPlants, opts.year)
  const plantById = plantsById(plants)
  const lines: string[] = []

  const sizeAttr = size ? ` width="${size.width}" height="${size.height}"` : ''
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${garden.width} ${garden.height}"${sizeAttr}>`)
  lines.push(
    `<rect x="0" y="0" width="${garden.width}" height="${garden.height}" fill="#fdfbf5" stroke="#a89f8d" stroke-width="2"/>`,
  )

  for (const l of gridLines(garden.width, garden.height, SNAP)) {
    lines.push(
      `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.major ? '#ddd3bf' : '#eee8da'}" stroke-width="1"/>`,
    )
  }

  for (let x = 0; x <= garden.width; x += 100) {
    lines.push(
      `<text x="${x}" y="0" fill="#b3a892" font-size="12" text-anchor="middle" dy="-4">${x}</text>`,
    )
  }
  for (let y = 0; y <= garden.height; y += 100) {
    lines.push(
      `<text x="0" y="${y}" fill="#b3a892" font-size="12" dx="4" dy="4">${y}</text>`,
    )
  }

  for (const bed of beds) {
    const fontSize = Math.max(8, Math.min(16, Math.min(bed.w, bed.h) * 0.18))
    lines.push(
      `<rect x="${bed.x}" y="${bed.y}" width="${bed.w}" height="${bed.h}" fill="${bed.color}" fill-opacity="0.35" stroke="${bed.color}" stroke-width="1.5" rx="3"/>`,
    )
    if (bed.name) {
      lines.push(
        `<text x="${bed.x + bed.w / 2}" y="${bed.y + bed.h / 2}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" fill="#3a362e" stroke="#fff" stroke-width="3" paint-order="stroke">${escapeXml(bed.name)}</text>`,
      )
    }
  }

  for (const p of placed) {
    const bed = beds.find((b) => b.id === p.bedId)
    const plant = plantById.get(p.plantId)
    if (!bed || !plant) continue
    const { x: cx, y: cy } = placedCenter(p, bed)
    const r = p.size / 2
    const dimmed = opts.season !== 'all' && !phaseMatchesSeason(plant, opts.phase, opts.season)
    lines.push(`<g${dimmed ? ' opacity="0.3"' : ''}>`)
    lines.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${plant.color}" fill-opacity="0.35" stroke="${plant.color}" stroke-width="1.5"/>`,
    )
    lines.push(
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${p.size * 0.8}">${escapeXml(plant.emoji)}</text>`,
    )
    lines.push('</g>')
  }

  lines.push('</svg>')
  return lines.join('\n')
}

export interface PrintSeedGroup {
  plantId: string
  emoji: string
  name: string
  seeds: PrintSeedItem[]
}

export interface PrintSeedItem {
  name: string
  producer: string
  filled: string
  expires: string
  badge: string
}

/** Samenbank-Einträge, gruppiert nach Pflanze (alphabetisch nach Pflanzenname sortiert). */
export function buildPrintSeedBank(state: AppState): PrintSeedGroup[] {
  const plantById = plantsById(state.plants)
  const groups = new Map<string, PrintSeedGroup>()

  for (const seed of state.seeds) {
    const plant = plantById.get(seed.plantId)
    if (!plant) continue
    let group = groups.get(seed.plantId)
    if (!group) {
      group = { plantId: plant.id, emoji: plant.emoji, name: plant.name, seeds: [] }
      groups.set(seed.plantId, group)
    }
    group.seeds.push({
      name: seed.name,
      producer: seed.producer,
      filled: seed.filled,
      expires: seed.expires,
      badge: EXPIRY_BADGES[expiryStatus(seed)],
    })
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/** HTML-Abschnitt für die Samenbank, gruppiert nach Pflanze. */
export function buildPrintSeedBankHtml(state: AppState): string {
  const groups = buildPrintSeedBank(state)

  if (groups.length === 0) {
    return `<section class="seedbank">
<h2>Saatgut</h2>
<p class="muted">Keine Saatgut-Einträge in der Samenbank.</p>
</section>`
  }

  const sections = groups
    .map((group) => {
      const seedRows = group.seeds
        .map(
          (s) =>
            `<tr>
  <td>${escapeXml(s.name)}</td>
  <td>${escapeXml(s.producer)}</td>
  <td>${escapeXml(formatSeedDate(s.filled))}</td>
  <td>${escapeXml(formatSeedDate(s.expires))}</td>
  <td>${escapeXml(s.badge)}</td>
</tr>`,
        )
        .join('\n')
      return `<section class="seed-group">
<h3><span class="seed-emoji">${escapeXml(group.emoji)}</span>${escapeXml(group.name)}</h3>
<table class="seed-table">
<thead>
  <tr><th>Sorte</th><th>Hersteller</th><th>Abfülldatum</th><th>Haltbarkeit</th><th>Status</th></tr>
</thead>
<tbody>
${seedRows}
</tbody>
</table>
</section>`
    })
    .join('\n')

  return `<section class="seedbank" id="seedbank">
<h2>Saatgut-Samenbank</h2>
${sections}
</section>`
}