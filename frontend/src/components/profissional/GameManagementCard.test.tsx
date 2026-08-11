import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GameManagementCard } from '@/components/profissional/GameManagementCard'
import type { Game } from '@/types/game'

function fakeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    slug: 'escreva-seu-nome',
    titulo: 'Escreva seu nome',
    descricao: 'Atividade de escrita do nome.',
    tutorial: 'Escreva seu nome passando o dedo sobre as letras pontilhadas.',
    categoria: 'coordenacao-motora',
    visibilidade: 'public',
    status: 'published',
    svg_url: '/api/games/1/svg',
    thumb_url: null,
    banner_url: null,
    cores: ['#08ADAE'],
    stats: { partidas: 42, tempo_medio_min: 12, score_medio: 87 },
    ...overrides,
  }
}

describe('GameManagementCard', () => {
  it('mostra título, stats reais, categoria e pill Publicado', () => {
    render(<GameManagementCard game={fakeGame()} onEdit={vi.fn()} onToggleStatus={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Escreva seu nome' })).toBeInTheDocument()
    expect(screen.getByText('Vezes jogado:')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Pontuação média:')).toBeInTheDocument()
    expect(screen.getByText('87%')).toBeInTheDocument()
    expect(screen.getByText('Coordenação motora')).toBeInTheDocument()
    expect(screen.getByText('Publicado')).toBeInTheDocument()
  })

  it('rascunho mostra pill amarela e botão Publicar', () => {
    render(
      <GameManagementCard
        game={fakeGame({ status: 'draft' })}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
      />,
    )

    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Publicar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Despublicar/ })).not.toBeInTheDocument()
  })

  it('publicado mostra botão Despublicar', () => {
    render(<GameManagementCard game={fakeGame()} onEdit={vi.fn()} onToggleStatus={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Despublicar/ })).toBeInTheDocument()
  })

  it('com thumb_url renderiza a thumbnail real no lugar do SVG', () => {
    const { container } = render(
      <GameManagementCard
        game={fakeGame({ thumb_url: '/api/games/1/thumb' })}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
      />,
    )

    // img decorativo (alt vazio) não expõe role — busca direto no DOM.
    // A base da API vem de VITE_API_URL (import.meta.env) — checa o caminho.
    const thumbnail = container.querySelector('img')
    expect(thumbnail?.getAttribute('src')).toContain('/api/games/1/thumb')
  })

  it('sem arte mostra o título como fallback na área da thumbnail', () => {
    render(
      <GameManagementCard
        game={fakeGame({ svg_url: null, thumb_url: null })}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Escreva seu nome')).toHaveLength(2)
  })

  it('Editar chama onEdit com o jogo', () => {
    const onEdit = vi.fn()
    const game = fakeGame()
    render(<GameManagementCard game={game} onEdit={onEdit} onToggleStatus={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }))

    expect(onEdit).toHaveBeenCalledWith(game)
  })

  it('Publicar chama onToggleStatus com o jogo', () => {
    const onToggleStatus = vi.fn()
    const game = fakeGame({ status: 'draft' })
    render(<GameManagementCard game={game} onEdit={vi.fn()} onToggleStatus={onToggleStatus} />)

    fireEvent.click(screen.getByRole('button', { name: /Publicar/ }))

    expect(onToggleStatus).toHaveBeenCalledWith(game)
  })
})
