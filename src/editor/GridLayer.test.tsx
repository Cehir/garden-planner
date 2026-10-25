import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GridLayer from './GridLayer'

describe('GridLayer', () => {
  it('beschriftet das Lineal wie der Druck ab 0', () => {
    const { container } = render(
      <svg>
        <GridLayer width={250} height={150} />
      </svg>,
    )
    const labels = [...container.querySelectorAll('text')].map((t) => t.textContent)
    // Ecke einmal 0 – oben 100, 200 – links 100
    expect(labels).toEqual(['0', '100', '200', '100'])
  })

  it('setzt die obere Beschriftung innerhalb des Randes', () => {
    const { container } = render(
      <svg>
        <GridLayer width={250} height={150} />
      </svg>,
    )
    const top = container.querySelector('text[x="100"][y="0"]')
    expect(top?.getAttribute('text-anchor')).toBe('middle')
    expect(Number(top?.getAttribute('dy'))).toBeGreaterThan(0)
    const corner = container.querySelector('text[x="0"][y="0"]')
    expect(corner?.textContent).toBe('0')
    expect(corner?.getAttribute('text-anchor')).toBe('start')
  })
})
