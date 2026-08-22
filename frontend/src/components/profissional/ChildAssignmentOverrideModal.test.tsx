import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_TRACING_GAME_CONFIG } from '@/lib/tracing/types'
import { ChildAssignmentOverrideModal } from './ChildAssignmentOverrideModal'

describe('ChildAssignmentOverrideModal (Ticket A4 Per-Child Override)', () => {
  it('renders inherited game defaults and child name', () => {
    render(
      <ChildAssignmentOverrideModal
        childId="c-1"
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
    expect(screen.getAllByText(/70%/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Pausa com prazo/i).length).toBeGreaterThanOrEqual(1)
  })

  it('allows overriding contact mode and saving', () => {
    const onSave = vi.fn()
    render(
      <ChildAssignmentOverrideModal
        childId="c-1"
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

    fireEvent.click(screen.getByText('Contínuo estrito'))
    fireEvent.click(screen.getByText(/Salvar personalização/i))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'c-1',
        gameId: 10,
        mode: 'strict_continuous',
      }),
    )
  })

  it('handles reset to inherited defaults', () => {
    const onReset = vi.fn()
    render(
      <ChildAssignmentOverrideModal
        childId="c-1"
        childName="Lucas"
        gameId={10}
        gameTitle="Escreva seu nome"
        gameConfig={DEFAULT_TRACING_GAME_CONFIG}
        existingOverride={{
          childId: 'c-1',
          childName: 'Lucas',
          gameId: 10,
          mode: 'free',
          completionThreshold: 85,
          graceDurationSeconds: 3.0,
          allowedGlyphs: ['A', 'B'],
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
