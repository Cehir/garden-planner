import type { AppState, Garden, Phase, Season } from './types'
import { placedInYear } from './selection'
import { phaseMatchesSeason, SEASON_LABELS } from './seasons'
import { expiryStatus, EXPIRY_BADGES, formatSeedDate } from './seeds'
import { plantsById, placedCenter } from './selectors'
import { gridLines, RULER_FONT_SIZE, rulerLabels } from './grid'
import { ACCENT_COLOR, FRAME_COLOR, INK_COLOR, RULER_COLOR } from './palette'

// A4 hochkant in CSS-Pixeln (96 dpi); Platz für Kopf + Legende wird freigehalten
export const PRINT_PAGE_W = 794
export const PRINT_PAGE_H = 1123
export const PRINT_MARGIN = 48
export const PRINT_HEADER_LEGEND_RESERVE = 240

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
    `<rect x="0" y="0" width="${garden.width}" height="${garden.height}" fill="#fdfbf5" stroke="${FRAME_COLOR}" stroke-width="2"/>`,
  )

  for (const l of gridLines(garden.width, garden.height)) {
    lines.push(
      `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.major ? '#ddd3bf' : '#eee8da'}" stroke-width="1"/>`,
    )
  }

  for (const l of rulerLabels(garden.width, garden.height)) {
    lines.push(
      `<text x="${l.x}" y="${l.y}" fill="${RULER_COLOR}" font-size="${RULER_FONT_SIZE}" text-anchor="${l.anchor}" dx="${l.dx}" dy="${l.dy}">${l.value}</text>`,
    )
  }

  for (const bed of beds) {
    const fontSize = Math.max(8, Math.min(16, Math.min(bed.w, bed.h) * 0.18))
    lines.push(
      `<rect x="${bed.x}" y="${bed.y}" width="${bed.w}" height="${bed.h}" fill="${bed.color}" fill-opacity="0.35" stroke="${bed.color}" stroke-width="1.5" rx="3"/>`,
    )
    if (bed.name) {
      lines.push(
        `<text x="${bed.x + bed.w / 2}" y="${bed.y + bed.h / 2}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" fill="${INK_COLOR}" stroke="#fff" stroke-width="3" paint-order="stroke">${escapeXml(bed.name)}</text>`,
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

/** Maßstab, mit dem der Garten vollständig auf eine Druckseite passt. */
export function printPageScale(garden: Garden): number {
  return Math.min(
    (PRINT_PAGE_W - 2 * PRINT_MARGIN) / garden.width,
    (PRINT_PAGE_H - 2 * PRINT_MARGIN - PRINT_HEADER_LEGEND_RESERVE) / garden.height,
  )
}

/** Größe des Druck-SVGs (auf zwei Nachkommastellen gerundet). */
export function printSvgSize(garden: Garden): PrintSize {
  const scale = printPageScale(garden)
  return {
    width: Math.round(garden.width * scale * 100) / 100,
    height: Math.round(garden.height * scale * 100) / 100,
  }
}

/** Vollständiges HTML-Dokument für das Druckfenster: Kopf, Plan, Legende, Samenbank. */
export function buildPrintDocument(state: AppState, opts: PrintOptions, size: PrintSize): string {
  const { garden } = state
  const { year, season } = opts
  const svg = buildPrintSvg(state, opts, size)
  const legend = buildPrintLegend(state, year)

  const legendHtml = legend.length
    ? legend
        .map(
          (l) =>
            `<li><span class="lg-emoji">${escapeXml(l.emoji)}</span><span class="lg-name">${escapeXml(l.name)}</span><span class="lg-spacing">${l.spacing} cm</span></li>`,
        )
        .join('')
    : '<li class="muted">Keine Pflanzen im gewählten Jahr.</li>'

  const seasonNote = season !== 'all' ? ` · ${SEASON_LABELS[season]}` : ''
  const title = `${garden.name} – Gartenplan ${year}`
  const seedBankHtml = buildPrintSeedBankHtml(state)
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeXml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 24px; font-family: system-ui, 'Segoe UI', Roboto, sans-serif; color: ${INK_COLOR}; }
  header { margin-bottom: 16px; }
  h1 { margin: 0 0 4px; font-size: 20px; color: ${ACCENT_COLOR}; }
  .meta { margin: 0; color: #6b6357; font-size: 13px; }
  svg { display: block; max-width: 100%; border: 1px solid #e2dccc; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  h2 { margin: 18px 0 8px; font-size: 15px; color: ${ACCENT_COLOR}; }
  .plan-legend { page-break-inside: avoid; break-inside: avoid; }
  ul.legend { list-style: none; padding: 0; margin: 0; column-width: 120px; column-gap: 16px; }
  ul.legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
  .lg-emoji { font-size: 18px; }
  .lg-spacing { color: #8a8172; }
  .muted { color: #8a8172; font-style: italic; }
  .seedbank { margin-top: 24px; page-break-before: always; break-before: page; }
  .seed-group { margin: 0 0 14px; }
  .seed-group h3 { margin: 0 0 6px; font-size: 14px; color: ${INK_COLOR}; }
  .seed-emoji { font-size: 18px; margin-right: 8px; }
  table.seed-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.seed-table th, table.seed-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #e2dccc; }
  table.seed-table th { color: #6b6357; font-weight: 600; background: #f6f2e9; }
  @media print { @page { margin: 12mm; } }
</style>
</head>
<body>
<header>
  <h1>${escapeXml(garden.name)}</h1>
  <p class="meta">Maße: ${garden.width} × ${garden.height} cm · Jahr ${year}${seasonNote}</p>
</header>
${svg}
<div class="plan-legend">
<h2>Legende</h2>
<ul class="legend">${legendHtml}</ul>
</div>
${seedBankHtml}
</body>
</html>`
}