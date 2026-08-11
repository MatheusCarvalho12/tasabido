import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GameCard } from '@/components/jogos/GameCard'
import type { Game } from '@/types/game'

function fakeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    slug: 'escreva-seu-nome',
    titulo: 'Escreva seu nome',
    descricao: 'Atividade de escrita do nome.',
    tutorial: 'Escreva seu nome passando o dedo sobre as letras pontilhadas.',
    categoria: 'escrita',
    visibilidade: 'public',
    status: 'published',
    svg_url: '/api/games/1/svg',
    cores: ['#08ADAE'],
    stats: { partidas: 2100, tempo_medio_min: 12, score_medio: 96 },
    ...overrides,
  }
}

describe('GameCard', () => {
  it('mostra título e stats reais formatadas em pt-BR', () => {
    render(<GameCard game={fakeGame()} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Escreva seu nome/ })).toBeInTheDocument()
    expect(screen.getByText('Escreva seu nome')).toBeInTheDocument()
    // Nota 96 → 4,8 estrelas; 2.100 partidas → "2,1 mil jogadas".
    expect(screen.getByText('4,8')).toBeInTheDocument()
    expect(screen.getByText('2,1 mil jogadas')).toBeInTheDocument()
  })

  it('renderiza o badge de checklist da seção "Para casa"', () => {
    const { container } = render(
      <GameCard game={fakeGame()} badge="checklist" onSelect={vi.fn()} />,
    )

    expect(container.querySelector('[aria-hidden="true"] svg')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Para casa/ })).toBeInTheDocument()
  })

  it('sem badge não anuncia "Para casa" no aria-label', () => {
    render(<GameCard game={fakeGame()} onSelect={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /Para casa/ })).not.toBeInTheDocument()
  })

  it('chama onSelect com o jogo e o centro do card ao clicar', () => {
    const onSelect = vi.fn()
    const game = fakeGame()
    render(<GameCard game={game} onSelect={onSelect} />)

    const card = screen.getByRole('button', { name: /Escreva seu nome/ })
    // Centro do card na viewport (getBoundingClientRect do jsdom é tudo 0).
    fireEvent.click(card)

    expect(onSelect).toHaveBeenCalledWith(game, { x: 0, y: 0 })
  })

  it('sem svg mostra o nome da atividade em grande', () => {
    render(<GameCard game={fakeGame({ svg_url: null })} onSelect={vi.fn()} />)

    expect(screen.getAllByText('Escreva seu nome')).toHaveLength(2) // thumbnail + painel
  })

  it('stats zeradas são honestas (0 jogadas, nota 0)', () => {
    render(
      <GameCard
        game={fakeGame({ stats: { partidas: 0, tempo_medio_min: 0, score_medio: 0 } })}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('0 jogadas')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
