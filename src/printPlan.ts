import type { AppState, Phase, Season } from './types'
import { placedInYear } from './utils'
import { phaseMatchesSeason } from './seasons'

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
  const byId = new Map(state.plants.map((p) => [p.id, p]))
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
  const plantById = new Map(plants.map((p) => [p.id, p]))
  const lines: string[] = []

  const sizeAttr = size ? ` width="${size.width}" height="${size.height}"` : ''
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${garden.width} ${garden.height}"${sizeAttr}>`)
  lines.push(
    `<rect x="0" y="0" width="${garden.width}" height="${garden.height}" fill="#fdfbf5" stroke="#a89f8d" stroke-width="2"/>`,
  )

  for (let x = 0; x <= garden.width; x += SNAP) {
    const major = x % 50 === 0
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${garden.height}" stroke="${major ? '#ddd3bf' : '#eee8da'}" stroke-width="1"/>`,
    )
  }
  for (let y = 0; y <= garden.height; y += SNAP) {
    const major = y % 50 === 0
    lines.push(
      `<line x1="0" y1="${y}" x2="${garden.width}" y2="${y}" stroke="${major ? '#ddd3bf' : '#eee8da'}" stroke-width="1"/>`,
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
    const cx = bed.x + p.x * bed.w
    const cy = bed.y + p.y * bed.h
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