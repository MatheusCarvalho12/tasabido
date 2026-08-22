import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CANONICAL_GLYPH_SET_ID, DEFAULT_TRACING_GAME_CONFIG } from '@/lib/tracing/types'
import { ChildAssignmentOverrideModal } from './ChildAssignmentOverrideModal'

describe('ChildAssignmentOverrideModal (Ticket A4 Per-Child Override)', () => {
  it('renders inherited game defaults and child name with atomic set', () => {
    render(
      <ChildAssignmentOverrideModal
        childId="child-1"
        childName="Lucas"
        gameId={10}
        gameTitle="Escreva seu nome"
        gameConfig={DEFAULT_TRACING_GAME_CONFIG}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(screen.getByText(/Ajustes de Traçado: Lucas/i)).toBeInTheDocument()
    expect(screen.getByText(/Jogo: Escreva seu nome/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Maiúsculas bloco/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/70%/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Pausa com prazo/i).length).toBeGreaterThanOrEqual(1)
  })

  it('allows overriding contact mode via accessible radiogroup and saving', () => {
    const onSave = vi.fn()
    render(
      <ChildAssignmentOverrideModal
        childId="child-1"
        childName="Lucas"
        gameId={10}
        gameTitle="Escreva seu nome"
        gameConfig={DEFAULT_TRACING_GAME_CONFIG}
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
        onReset={vi.fn()}
      />,
    )

    const strictRadio = screen.getByRole('radio', { name: 'Contínuo estrito' })
    fireEvent.click(strictRadio)
    fireEvent.click(screen.getByText(/Salvar personalização/i))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-1',
        gameId: 10,
        mode: 'strict_continuous',
      }),
    )
  })

  it('handles threshold override covering 0..100 contract', () => {
    const onSave = vi.fn()
    render(
      <ChildAssignmentOverrideModal
        childId="child-1"
        childName="Lucas"
        gameId={10}
        gameTitle="Escreva seu nome"
        gameConfig={DEFAULT_TRACING_GAME_CONFIG}
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
        onReset={vi.fn()}
      />,
    )

    const slider = screen.getByLabelText(/Limiar de precisão/i)
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '100')

    fireEvent.change(slider, { target: { value: '90' } })
    fireEvent.click(screen.getByText(/Salvar personalização/i))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-1',
        gameId: 10,
        completionThreshold: 90,
      }),
    )
  })

  it('handles reset to inherited defaults', () => {
    const onReset = vi.fn()
    render(
      <ChildAssignmentOverrideModal
        childId="child-1"
        childName="Lucas"
        gameId={10}
        gameTitle="Escreva seu nome"
        gameConfig={DEFAULT_TRACING_GAME_CONFIG}
        existingOverride={{
          childId: 'child-1',
          childName: 'Lucas',
          gameId: 10,
          glyphSetId: CANONICAL_GLYPH_SET_ID,
          mode: 'free',
          completionThreshold: 85,
          graceDurationSeconds: 3.0,
        }}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={onReset}
      />,
    )

    fireEvent.click(screen.getByText(/Resetar para padrão do jogo/i))
    expect(onReset).toHaveBeenCalled()
  })
})
