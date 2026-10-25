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
    // oben 0, 100, 200 – links 0, 100
    expect(labels).toEqual(['0', '100', '200', '0', '100'])
  })
})
