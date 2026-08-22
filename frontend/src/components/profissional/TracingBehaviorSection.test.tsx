import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_TRACING_GAME_CONFIG } from '@/lib/tracing/types'
import { TracingBehaviorSection } from './TracingBehaviorSection'

describe('TracingBehaviorSection (Ticket A4 Professional Tracing Config)', () => {
  it('renders all 39 immutable catalog glyphs and default threshold 70', () => {
    render(<TracingBehaviorSection config={DEFAULT_TRACING_GAME_CONFIG} onChange={vi.fn()} />)

    expect(screen.getByText(/Comportamento do traçado/i)).toBeInTheDocument()
    expect(screen.getAllByText(/70%/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Ü')).toBeInTheDocument()
    expect(screen.getByText('Ç')).toBeInTheDocument()
    expect(screen.getByText('Ã')).toBeInTheDocument()
  })

  it('allows switching contact modes (strict_continuous, timed_pause, free)', () => {
    const onChange = vi.fn()
    render(<TracingBehaviorSection config={DEFAULT_TRACING_GAME_CONFIG} onChange={onChange} />)

    fireEvent.click(screen.getByText(/Contínuo estrito/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'strict_continuous' }))

    fireEvent.click(screen.getByText(/Livre/i))
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

    expect(screen.getByText(/1,5s \(padrão\)/i)).toBeInTheDocument()
    expect(screen.getByText('0s (imediato)')).toBeInTheDocument()
    expect(screen.getByText('2s')).toBeInTheDocument()
    expect(screen.getByText('3s')).toBeInTheDocument()

    fireEvent.click(screen.getByText('2s'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ graceDurationSeconds: 2.0 }))
  })

  it('updates threshold slider', () => {
    const onChange = vi.fn()
    render(<TracingBehaviorSection config={DEFAULT_TRACING_GAME_CONFIG} onChange={onChange} />)

    const slider = screen.getByLabelText(/Limiar de precisão para conclusão/i)
    fireEvent.change(slider, { target: { value: '80' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ completionThreshold: 80 }))
  })

  it('renders preview of canonical geometry for selected letter', () => {
    render(<TracingBehaviorSection config={DEFAULT_TRACING_GAME_CONFIG} onChange={vi.fn()} />)

    expect(screen.getByText(/Pré-visualização: Letra A/i)).toBeInTheDocument()

    // Click on B to preview B
    fireEvent.click(screen.getByText('B'))
    expect(screen.getByText(/Pré-visualização: Letra B/i)).toBeInTheDocument()
  })
})
