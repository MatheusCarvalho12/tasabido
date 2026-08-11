import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { GameCarousel } from '@/components/jogos/GameCarousel'
import type { Game } from '@/types/game'

function fakeGame(id: number, titulo: string): Game {
  return {
    id,
    slug: `jogo-${id}`,
    titulo,
    descricao: '',
    tutorial: '',
    categoria: 'escrita',
    visibilidade: 'public',
    status: 'published',
    svg_url: null,
    thumb_url: null,
    banner_url: null,
    cores: ['#08ADAE'],
    stats: { partidas: 2100, tempo_medio_min: 12, score_medio: 96 },
  }
}

const GAMES = [
  fakeGame(1, 'Escreva seu nome'),
  fakeGame(2, 'Desenhe o macaco'),
  fakeGame(3, 'Pinte o arco-íris'),
  fakeGame(4, 'Complete as formas'),
  fakeGame(5, 'Ligue os pontos'),
  fakeGame(6, 'Trace o caminho'),
]

// jsdom não tem layout: medimos 200px por card (offsetWidth) para o stride.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return this.hasAttribute('data-carousel-card') ? 200 : 0
    },
  })
  // jsdom não implementa scrollBy/scrollTo — definimos mocks no prototype.
  Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('GameCarousel', () => {
  it('renderiza o título da seção e os jogos', () => {
    render(
      <GameCarousel
        sectionId="mais-jogados"
        title="Mais jogados"
        emptyMessage="vazio"
        games={GAMES}
        state="ready"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Mais jogados' })).toBeInTheDocument()
    // Sem "Ver todos": o link foi removido por não haver página de destino.
    expect(screen.queryByRole('link', { name: /Ver todos/ })).not.toBeInTheDocument()
    // O DOM é triplicado para o loop infinito — os cards aparecem 3x.
    expect(screen.getAllByRole('button', { name: /Escreva seu nome/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Trace o caminho/ }).length).toBeGreaterThan(0)
  })

  it('triplica o DOM para o loop infinito', () => {
    const { container } = render(
      <GameCarousel
        sectionId="s"
        title="Seção"
        emptyMessage="vazio"
        games={GAMES}
        state="ready"
        onSelect={vi.fn()}
      />,
    )

    // 6 jogos × 3 cópias = 18 cards
    expect(container.querySelectorAll('[data-carousel-card]')).toHaveLength(18)
  })

  it('seta próxima/anterior rolam o trilho', () => {
    render(
      <GameCarousel
        sectionId="s"
        title="Seção"
        emptyMessage="vazio"
        games={GAMES}
        state="ready"
        onSelect={vi.fn()}
      />,
    )

    const next = screen.getByRole('button', { name: 'Próximo: mais jogos de Seção' })
    const prev = screen.getByRole('button', { name: 'Anterior: mais jogos de Seção' })

    fireEvent.click(next)
    const scrollByMock = vi.mocked(HTMLElement.prototype.scrollBy)
    expect(scrollByMock).toHaveBeenCalledTimes(1)
    const nextCall = scrollByMock.mock.calls[0][0] as unknown as { left: number }
    expect(nextCall.left).toBeGreaterThan(0)

    fireEvent.click(prev)
    expect(scrollByMock).toHaveBeenCalledTimes(2)
    const prevCall = scrollByMock.mock.calls[1][0] as unknown as { left: number }
    expect(prevCall.left).toBeLessThan(0)
  })

  it('setas do teclado (ArrowLeft/ArrowRight) rolam o trilho', () => {
    render(
      <GameCarousel
        sectionId="s"
        title="Seção"
        emptyMessage="vazio"
        games={GAMES}
        state="ready"
        onSelect={vi.fn()}
      />,
    )

    // Há dois regions com o mesmo nome: o section externo (aria-labelledby) e
    // o trilho do carrossel (aria-label) — pegamos o de dentro.
    const track = screen.getAllByRole('region', { name: 'Seção' })[1]
    fireEvent.keyDown(track, { key: 'ArrowRight' })
    fireEvent.keyDown(track, { key: 'ArrowLeft' })

    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledTimes(2)
  })

  it('clicar num card dispara onSelect com o jogo', () => {
    const onSelect = vi.fn()
    render(
      <GameCarousel
        sectionId="s"
        title="Seção"
        emptyMessage="vazio"
        games={GAMES}
        state="ready"
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /Desenhe o macaco/ })[0])
    expect(onSelect).toHaveBeenCalledWith(GAMES[1], expect.any(Object))
  })

  it('mostra o estado vazio humanizado sem inventar jogos', () => {
    render(
      <GameCarousel
        sectionId="para-casa"
        title="Para casa"
        emptyMessage="Quando um profissional indicar um jogo, ele aparece aqui."
        games={[]}
        state="ready"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('Nada por aqui ainda.')).toBeInTheDocument()
    expect(
      screen.getByText('Quando um profissional indicar um jogo, ele aparece aqui.'),
    ).toBeInTheDocument()
  })

  it('mostra skeletons durante o carregamento e botão de tentar de novo no erro', () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <GameCarousel
        sectionId="s"
        title="Seção"
        emptyMessage="vazio"
        games={undefined}
        state="loading"
        onRetry={onRetry}
        onSelect={vi.fn()}
      />,
    )
    expect(document.querySelectorAll('[data-carousel-card]').length).toBeGreaterThan(0)

    rerender(
      <GameCarousel
        sectionId="s"
        title="Seção"
        emptyMessage="vazio"
        games={undefined}
        state="error"
        onRetry={onRetry}
        onSelect={vi.fn()}
      />,
    )
    const retry = screen.getByRole('button', { name: 'Tentar de novo' })
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
