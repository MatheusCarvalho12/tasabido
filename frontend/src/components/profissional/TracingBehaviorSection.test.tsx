import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CANONICAL_GLYPH_SET_HASH, DEFAULT_TRACING_GAME_CONFIG } from '@/lib/tracing/types'
import { TracingBehaviorSection } from './TracingBehaviorSection'

describe('TracingBehaviorSection (Ticket A4 Professional Tracing Config)', () => {
  it('renders atomic complete named glyph set with ID, version, and SHA-256 hash', () => {
    render(<TracingBehaviorSection config={DEFAULT_TRACING_GAME_CONFIG} onChange={vi.fn()} />)

    expect(screen.getByText(/Comportamento do traçado/i)).toBeInTheDocument()
    expect(screen.getByText(/Maiúsculas bloco/i)).toBeInTheDocument()
    expect(screen.getByText(/v1.0.0/i)).toBeInTheDocument()
    expect(screen.getAllByText(/39 caracteres/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(new RegExp(CANONICAL_GLYPH_SET_HASH, 'i'))).toBeInTheDocument()
    expect(screen.getAllByText(/70%/i).length).toBeGreaterThanOrEqual(1)
  })

  it('allows picking a letter purely for visual inspection without altering set membership', () => {
    const onChange = vi.fn()
    render(<TracingBehaviorSection config={DEFAULT_TRACING_GAME_CONFIG} onChange={onChange} />)

    expect(screen.getByText(/Pré-visualização: Letra A/i)).toBeInTheDocument()

    // Click on 'B' for visual inspection
    fireEvent.click(screen.getByText('B'))
    expect(screen.getByText(/Pré-visualização: Letra B/i)).toBeInTheDocument()

    // Inspecting a letter must NOT trigger onChange or modify glyph set
    expect(onChange).not.toHaveBeenCalled()
  })

  it('allows switching contact modes with accessible radiogroup semantics', () => {
    const onChange = vi.fn()
    render(<TracingBehaviorSection config={DEFAULT_TRACING_GAME_CONFIG} onChange={onChange} />)

    const strictRadio = screen.getByRole('radio', { name: /Contínuo estrito/i })
    expect(strictRadio).toBeInTheDocument()
    fireEvent.click(strictRadio)

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'strict_continuous' }))

    const freeRadio = screen.getByRole('radio', { name: /Livre/i })
    fireEvent.click(freeRadio)

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'free' }))
  })

  it('renders pause options with 1.5s clearly indicated as default when in timed_pause mode', () => {
    const onChange = vi.fn()
    render(
      <TracingBehaviorSection
        config={{ ...DEFAULT_TRACING_GAME_CONFIG, mode: 'timed_pause' }}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('radio', { name: /1,5s \(padrão\)/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /0s \(imediato\)/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /2s/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /3s/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /2s/i }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ graceDurationSeconds: 2.0 }))
  })

  it('updates threshold slider covering 0..100 contract with default 70', () => {
    const onChange = vi.fn()
    render(<TracingBehaviorSection config={DEFAULT_TRACING_GAME_CONFIG} onChange={onChange} />)

    const slider = screen.getByLabelText(/Limiar de precisão para conclusão/i)
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '100')
    expect(slider).toHaveValue('70')

    fireEvent.change(slider, { target: { value: '85' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ completionThreshold: 85 }))
  })
})
