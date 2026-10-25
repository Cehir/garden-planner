import { describe, expect, it } from 'vitest'
import type { AppState } from './types'
import {
  buildPrintDocument,
  buildPrintLegend,
  buildPrintSeedBank,
  buildPrintSeedBankHtml,
  buildPrintSvg,
  escapeXml,
  PRINT_HEADER_LEGEND_RESERVE,
  PRINT_MARGIN,
  PRINT_PAGE_H,
  PRINT_PAGE_W,
  printPageScale,
  printSvgSize,
} from './printPlan'

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
        light: 'full', soil: 'normal', family: 'andere', sow: [[3, 4]], plant: [[3, 4]], harvest: [[6, 8]],
      },
      {
        id: 'lettuce', name: 'Salat', emoji: '🥬', color: '#7fb069', spacing: 30, height: 25,
        light: 'partial', soil: 'normal', family: 'andere', sow: [[5, 7]], plant: [[5, 7]], harvest: [[6, 8]],
      },
      {
        id: 'tomato', name: 'Tomate', emoji: '🍅', color: '#d6364c', spacing: 40, height: 40,
        light: 'full', soil: 'normal', family: 'andere', sow: [[3, 5]], plant: [[3, 5]], harvest: [[7, 9]],
      },
    ],
    placedPlants: [
      { id: 'p1', bedId: 'b1', plantId: 'carrot', x: 0.25, y: 0.5, size: 20, plantedYear: 2026 },
      { id: 'p2', bedId: 'b2', plantId: 'lettuce', x: 0.5, y: 0.5, size: 24, plantedYear: 2026 },
      { id: 'p3', bedId: 'b2', plantId: 'tomato', x: 0.8, y: 0.2, size: 20, plantedYear: 2025 },
    ],
    seeds: [],
    diary: [],
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

  it('beschriftet die Ecke nur einmal mit 0 und setzt oben innerhalb des Randes', () => {
    const svg = buildPrintSvg(makeState(), base)
    expect(svg.match(/>0<\/text>/g)).toHaveLength(1)
    const top = svg.match(/<text x="100" y="0"[^>]*text-anchor="middle" dx="[^"]*" dy="([^"]*)"/)
    expect(Number(top?.[1])).toBeGreaterThan(0)
    const corner = svg.match(/<text x="0" y="0"[^>]*text-anchor="start" dx="([^"]*)" dy="([^"]*)">0</)
    expect(Number(corner?.[1])).toBeGreaterThan(0)
    expect(Number(corner?.[2])).toBeGreaterThan(0)
  })

  it('setzt die Labels am rechten und unteren Rand innerhalb des Gartens', () => {
    // makeState(): Garten 800 × 600 cm
    const svg = buildPrintSvg(makeState(), base)
    expect(svg).toMatch(/<text x="800" y="0"[^>]*text-anchor="end" dx="-\d+"[^>]*>800</)
    const bottom = svg.match(/<text x="0" y="600"[^>]*dy="(-?\d+)">600</)
    expect(Number(bottom?.[1])).toBeLessThan(0)
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

describe('buildPrintSeedBank', () => {
  function makeStateWithSeeds(): AppState {
    const state = makeState()
    state.seeds = [
      { id: 's1', plantId: 'tomato', name: 'Cuore di Bue', producer: 'Samenhaus', filled: '2025-02-01', expires: '2027-02-01' },
      { id: 's2', plantId: 'tomato', name: 'Roma', producer: 'Gartenland', filled: '2024-02-01', expires: '2020-02-01' },
      { id: 's3', plantId: 'carrot', name: 'Lange rotes & gelbes', producer: 'Bioland', filled: '2026-03-15', expires: '2028-03-15' },
    ]
    return state
  }

  it('gruppiert Einträge nach Pflanze, alphabetisch sortiert', () => {
    const groups = buildPrintSeedBank(makeStateWithSeeds())
    expect(groups.map((g) => g.name)).toEqual(['Karotte', 'Tomate'])
  })

  it('enthält alle Saatgut-Einträge je Gruppe', () => {
    const groups = buildPrintSeedBank(makeStateWithSeeds())
    const tomato = groups.find((g) => g.name === 'Tomate')!
    expect(tomato.seeds.map((s) => s.name)).toEqual(['Cuore di Bue', 'Roma'])
    const carrot = groups.find((g) => g.name === 'Karotte')!
    expect(carrot.seeds.map((s) => s.name)).toEqual(['Lange rotes & gelbes'])
  })

  it('berechnet den Haltbarkeits-Status', () => {
    const groups = buildPrintSeedBank(makeStateWithSeeds())
    const tomato = groups.find((g) => g.name === 'Tomate')!
    const cuore = tomato.seeds[0]
    const roma = tomato.seeds[1]
    expect(cuore.badge).toContain('haltbar')
    expect(roma.badge).toContain('abgelaufen')
  })

  it('ignoriert Samen von gelöschten Pflanzen', () => {
    const state = makeStateWithSeeds()
    state.seeds.push({ id: 's9', plantId: 'missing', name: 'X', producer: '', filled: '', expires: '' })
    const groups = buildPrintSeedBank(state)
    expect(groups.flatMap((g) => g.seeds)).toHaveLength(3)
  })

  it('liefert eine leere Liste ohne Samen', () => {
    expect(buildPrintSeedBank(makeState())).toEqual([])
  })
})

describe('buildPrintSeedBankHtml', () => {
  it('enthält eine Sektion mit gruppierten Einträgen', () => {
    const state = makeState()
    state.seeds = [
      { id: 's1', plantId: 'tomato', name: 'Cuore de Bue & Co', producer: 'Samenhaus', filled: '2025-02-01', expires: '2027-02-01' },
    ]
    const html = buildPrintSeedBankHtml(state)
    expect(html).toContain('Saatgut-Samenbank')
    expect(html).toContain('Tomate')
    expect(html).toContain('Cuore de Bue &amp; Co')
    expect(html).toContain('Hersteller')
  })

  it('zeigt Hinweis bei leerer Samenbank', () => {
    const html = buildPrintSeedBankHtml(makeState())
    expect(html).toContain('Keine Saatgut-Einträge in der Samenbank.')
  })
})

describe('printPageScale', () => {
  const usableW = PRINT_PAGE_W - 2 * PRINT_MARGIN
  const usableH = PRINT_PAGE_H - 2 * PRINT_MARGIN - PRINT_HEADER_LEGEND_RESERVE

  it('begrenzt einen breiten Garten auf die Seitenbreite', () => {
    const scale = printPageScale({ name: 'G', width: 800, height: 600 })
    expect(scale).toBeCloseTo(usableW / 800)
    expect(800 * scale).toBeCloseTo(usableW)
    expect(600 * scale).toBeLessThanOrEqual(usableH)
  })

  it('begrenzt einen hohen Garten auf die Seitenhöhe abzüglich Kopf/Legende', () => {
    const scale = printPageScale({ name: 'G', width: 100, height: 1000 })
    expect(scale).toBeCloseTo(usableH / 1000)
    expect(100 * scale).toBeLessThanOrEqual(usableW)
  })
})

describe('printSvgSize', () => {
  it('liefert die skalierte Größe auf zwei Nachkommastellen gerundet', () => {
    const size = printSvgSize({ name: 'G', width: 300, height: 700 })
    const scale = printPageScale({ name: 'G', width: 300, height: 700 })
    expect(size.width).toBe(Math.round(300 * scale * 100) / 100)
    expect(size.height).toBe(Math.round(700 * scale * 100) / 100)
  })
})

describe('buildPrintDocument', () => {
  const size = { width: 698, height: 523.5 }

  it('ist ein vollständiges HTML-Dokument mit maskiertem Gartennamen im Titel', () => {
    const html = buildPrintDocument(makeState(), base, size)
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<title>Test &amp; Garten – Gartenplan 2026</title>')
    expect(html).toContain('<h1>Test &amp; Garten</h1>')
    expect(html).toContain('Maße: 800 × 600 cm · Jahr 2026</p>')
  })

  it('enthält den Plan in der übergebenen Größe', () => {
    const html = buildPrintDocument(makeState(), base, size)
    expect(html).toContain('<svg')
    expect(html).toContain('width="698" height="523.5"')
  })

  it('enthält die Legende des Jahres', () => {
    const html = buildPrintDocument(makeState(), base, size)
    expect(html).toContain('<span class="lg-name">Karotte</span><span class="lg-spacing">25 cm</span>')
    expect(html).toContain('<span class="lg-name">Salat</span>')
    expect(html).not.toContain('<span class="lg-name">Tomate</span>')
  })

  it('zeigt einen Hinweis bei leerer Legende', () => {
    const html = buildPrintDocument(makeState(), { ...base, year: 2030 }, size)
    expect(html).toContain('<li class="muted">Keine Pflanzen im gewählten Jahr.</li>')
  })

  it('nennt die gewählte Saison in den Metadaten', () => {
    const html = buildPrintDocument(makeState(), { ...base, season: 'summer' }, size)
    expect(html).toContain('Jahr 2026 · Sommer</p>')
  })

  it('enthält die Samenbank', () => {
    const html = buildPrintDocument(makeState(), base, size)
    expect(html).toContain('<section class="seedbank">')
  })
})