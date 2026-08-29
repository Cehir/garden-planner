import { describe, expect, it } from 'vitest'
import type { AppState } from './types'
import { buildPrintLegend, buildPrintSvg, escapeXml } from './printPlan'

function makeState(): AppState {
  return {
    garden: { name: 'Test & Garten', width: 800, height: 600 },
    beds: [
      { id: 'b1', name: 'Hochbeet <A>', x: 100, y: 100, w: 200, h: 150, color: '#7fb069', notes: '' },
      { id: 'b2', name: 'Breitbeet', x: 400, y: 100, w: 300, h: 200, color: '#6fa3a8', notes: '' },
    ],
    plants: [
      {
        id: 'carrot', name: 'Karotte', emoji: '🥕', color: '#d6364c', spacing: 25, height: 20,
        light: 'full', soil: 'normal', family: 'andere', sow: [3, 4], plant: [3, 4], harvest: [6, 8],
      },
      {
        id: 'lettuce', name: 'Salat', emoji: '🥬', color: '#7fb069', spacing: 30, height: 25,
        light: 'partial', soil: 'normal', family: 'andere', sow: [5, 7], plant: [5, 7], harvest: [6, 8],
      },
      {
        id: 'tomato', name: 'Tomate', emoji: '🍅', color: '#d6364c', spacing: 40, height: 40,
        light: 'full', soil: 'normal', family: 'andere', sow: [3, 5], plant: [3, 5], harvest: [7, 9],
      },
    ],
    placedPlants: [
      { id: 'p1', bedId: 'b1', plantId: 'carrot', x: 0.25, y: 0.5, size: 20, plantedYear: 2026 },
      { id: 'p2', bedId: 'b2', plantId: 'lettuce', x: 0.5, y: 0.5, size: 24, plantedYear: 2026 },
      { id: 'p3', bedId: 'b2', plantId: 'tomato', x: 0.8, y: 0.2, size: 20, plantedYear: 2025 },
    ],
    seeds: [],
  }
}

const base = { year: 2026, season: 'all' as const, phase: 'sow' as const }

describe('escapeXml', () => {
  it('maskiert Sonderzeichen in Namen', () => {
    expect(escapeXml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&apos;')
    expect(escapeXml('Karotte & Salat')).toBe('Karotte &amp; Salat')
  })
})

describe('buildPrintSvg', () => {
  it('enthält den Garten-Rahmen in den richtigen Maßen', () => {
    const svg = buildPrintSvg(makeState(), base)
    expect(svg).toContain('viewBox="0 0 800 600"')
    expect(svg).toContain('width="800" height="600" fill="#fdfbf5"')
  })

  it('enthält Grid-Linien (minor alle 10, major alle 50)', () => {
    const svg = buildPrintSvg(makeState(), base)
    expect(svg).toContain('<line x1="10" y1="0" x2="10" y2="600"')
    expect(svg).toContain('<line x1="50" y1="0" x2="50" y2="600"')
    expect(svg).toContain('<line x1="0" y1="10" x2="800" y2="10"')
  })

  it('enthält Maßlabels oben und links', () => {
    const svg = buildPrintSvg(makeState(), base)
    expect(svg).toContain('<text x="0" y="0"')
    expect(svg).toContain('<text x="100" y="0"')
    expect(svg).toContain('<text x="0" y="100"')
  })

  it('zeichnet Beete mit Name (maskiert)', () => {
    const svg = buildPrintSvg(makeState(), base)
    expect(svg).toContain('<rect x="100" y="100" width="200" height="150" fill="#7fb069"')
    expect(svg).toContain('Hochbeet &lt;A&gt;')
    expect(svg).toContain('Breitbeet')
  })

  it('druckt nur Pflanzen des gewählten Jahres', () => {
    const svg = buildPrintSvg(makeState(), base)
    expect(svg).toContain('🥕')
    expect(svg).toContain('🥬')
    expect(svg).not.toContain('🍅')
  })

  it('dimmst Pflanzen, die nicht zur Saison passen', () => {
    const svg = buildPrintSvg(makeState(), { year: 2026, season: 'summer', phase: 'sow' })
    const dimmed = svg.match(/opacity="0.3"/g)
    expect(dimmed).not.toBeNull()
    expect(dimmed!.length).toBe(1)
  })

  it('dimmt nichts, wenn keine Saison gewählt ist', () => {
    const svg = buildPrintSvg(makeState(), base)
    expect(svg).not.toContain('opacity="0.3"')
  })

  it('nutzt die übergebene Druckgröße im svg-Tag', () => {
    const svg = buildPrintSvg(makeState(), base, { width: 1072.5, height: 804.38 })
    expect(svg).toContain('width="1072.5" height="804.38"')
  })

  it('enthält keine Editor-UI-Elemente', () => {
    const svg = buildPrintSvg(makeState(), base)
    expect(svg).not.toContain('resize-handle')
    expect(svg).not.toContain('compass')
    expect(svg).not.toContain('pointer-events')
  })
})

describe('buildPrintLegend', () => {
  it('liefert eindeutige Pflanzenarten des Jahres, sortiert nach Name', () => {
    const legend = buildPrintLegend(makeState(), 2026)
    expect(legend.map((l) => l.name)).toEqual(['Karotte', 'Salat'])
    expect(legend.map((l) => l.emoji)).toEqual(['🥕', '🥬'])
    expect(legend.map((l) => l.spacing)).toEqual([25, 30])
  })

  it('berücksichtigt ein anderes Jahr', () => {
    const legend = buildPrintLegend(makeState(), 2025)
    expect(legend.map((l) => l.name)).toEqual(['Tomate'])
  })

  it('liefert eine leere Liste ohne Pflanzen', () => {
    const legend = buildPrintLegend(makeState(), 2030)
    expect(legend).toEqual([])
  })
})