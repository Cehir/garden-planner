import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RangeField, RangeListField } from './RangeFields'

describe('RangeField', () => {
  it('markiert ein jahresübergreifendes Fenster (Start nach Ende)', () => {
    render(<RangeField label="Ernte" value={[11, 2]} onChange={vi.fn()} />)
    expect(screen.getByTitle('Jahresübergreifend')).toBeInTheDocument()
  })

  it('zeigt keine Markierung für ein Fenster innerhalb eines Jahres', () => {
    render(<RangeField label="Ernte" value={[3, 6]} onChange={vi.fn()} />)
    expect(screen.queryByTitle('Jahresübergreifend')).not.toBeInTheDocument()
  })
})

describe('RangeListField', () => {
  it('fügt ein Standard-Fenster hinzu', () => {
    const onChange = vi.fn()
    render(<RangeListField label="Aussaat" values={[[1, 2]]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Aussaat hinzufügen/ }))
    expect(onChange).toHaveBeenCalledWith([[1, 2], [3, 6]])
  })

  it('entfernt das letzte verbleibende Fenster nicht', () => {
    const onChange = vi.fn()
    render(<RangeListField label="Aussaat" values={[[1, 2]]} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Fenster entfernen'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
