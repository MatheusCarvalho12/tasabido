import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Game } from '@/types/games'

import { GamePreviewModal } from './GamePreviewModal'

const fakeGame: Game = {
  id: 7,
  slug: 'desenhe-o-macaco',
  titulo: 'Desenhe o macaco',
  descricao: 'Atividade de desenho.',
  tutorial: 'Complete o desenho do macaco passando o dedo sobre as linhas pontilhadas.',
  categoria: 'coordenacao-motora',
  visibilidade: 'public',
  status: 'published',
  svg_url: '/api/games/7/svg',
  thumb_url: null,
  banner_url: null,
  cores: ['#08ADAE', '#F75A3D'],
  stats: { partidas: 2100, tempo_medio_min: 12, score_medio: 87 },
}

const zeroStatsGame: Game = {
  ...fakeGame,
  svg_url: null,
  stats: { partidas: 0, tempo_medio_min: 0, score_medio: 0 },
}

interface RenderOptions {
  game?: Game | null
  onClose?: () => void
  onPlay?: ((game: Game) => void) | undefined
}

async function renderModal(options: RenderOptions = {}) {
  const onClose = options.onClose ?? vi.fn()
  const onPlay = options.onPlay

  // jsdom persiste o history entre testes: um router anterior pode ter
  // navegado para /jogar/... — resetamos para a raiz antes de criar o novo.
  window.history.replaceState(null, '', '/')

  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <GamePreviewModal game={options.game ?? fakeGame} onClose={onClose} onPlay={onPlay} />
    ),
  })
  const playRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jogar/$slug',
    component: () => <div>Jogo em construção</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, playRoute]),
  })
  await router.load()
  render(<RouterProvider router={router} />)

  return { onClose, onPlay }
}

describe('GamePreviewModal', () => {
  it('mostra título, categoria, tutorial e métricas formatadas do contrato', async () => {
    await renderModal()

    expect(screen.getByRole('dialog', { name: 'Desenhe o macaco' })).toBeInTheDocument()
    expect(screen.getByText('Coordenação motora')).toBeInTheDocument()
    expect(screen.getByText(/Complete o desenho do macaco/)).toBeInTheDocument()
    expect(screen.getByText('12 min')).toBeInTheDocument()
    expect(screen.getByText('2,1 mil')).toBeInTheDocument()
    expect(screen.getByText('87%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jogar' })).toBeInTheDocument()
  })

  it('sem partidas mostra zeros — nunca inventa número', async () => {
    await renderModal({ game: zeroStatsGame })

    expect(screen.getByText('0 min')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('fecha pelo X', async () => {
    const { onClose } = await renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar preview' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha com ESC', async () => {
    const { onClose } = await renderModal()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha com clique fora do modal', async () => {
    const { onClose } = await renderModal()
    fireEvent.click(screen.getByTestId('game-preview-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Jogar chama onPlay com o jogo', async () => {
    const onPlay = vi.fn()
    await renderModal({ onPlay })
    await userEvent.click(screen.getByRole('button', { name: 'Jogar' }))
    expect(onPlay).toHaveBeenCalledWith(fakeGame)
  })

  it('sem onPlay navega para /jogar/{slug}', async () => {
    await renderModal({ onPlay: undefined })
    await userEvent.click(screen.getByRole('button', { name: 'Jogar' }))
    expect(await screen.findByText('Jogo em construção')).toBeInTheDocument()
  })

  it('foca o botão fechar ao abrir', async () => {
    await renderModal()
    expect(screen.getByRole('button', { name: 'Fechar preview' })).toHaveFocus()
  })

  it('sem svg mostra composição com nome + cor', async () => {
    await renderModal({ game: zeroStatsGame })

    const fallback = screen.getByTestId('game-preview-fallback-art')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveTextContent('Desenhe o macaco')
    // cores[0] vira o fundo do banner (cor pastel do jogo).
    expect(fallback.parentElement?.style.backgroundColor).toBe('rgb(8, 173, 174)')
  })

  it('com banner_url renderiza a imagem do banner no topo (prioridade sobre o SVG)', async () => {
    await renderModal({ game: { ...fakeGame, banner_url: '/api/games/7/banner' } })

    expect(document.querySelector('img[src$="/api/games/7/banner"]')).not.toBeNull()
    expect(document.querySelector('img[src$="/api/games/7/svg"]')).toBeNull()
    expect(screen.queryByTestId('game-preview-fallback-art')).not.toBeInTheDocument()
  })

  it('sem banner_url mantém o fallback atual (SVG ampliado sobre a cor pastel)', async () => {
    await renderModal()

    expect(document.querySelector('img[src$="/api/games/7/svg"]')).not.toBeNull()
    expect(document.querySelector('img[src$="/banner"]')).toBeNull()
  })

  it('banner quebrado (onError) esconde o <img> e mostra o fallback (SVG)', async () => {
    await renderModal({ game: { ...fakeGame, banner_url: '/api/games/7/banner' } })

    const banner = document.querySelector<HTMLImageElement>('img[src$="/api/games/7/banner"]')
    expect(banner).not.toBeNull()
    if (banner) {
      fireEvent.error(banner)
    }

    expect(document.querySelector('img[src$="/banner"]')).toBeNull()
    expect(document.querySelector('img[src$="/api/games/7/svg"]')).not.toBeNull()
  })

  it('banner quebrado sem SVG cai na composição com nome + cor', async () => {
    await renderModal({
      game: { ...fakeGame, banner_url: '/api/games/7/banner', svg_url: null },
    })

    const banner = document.querySelector<HTMLImageElement>('img[src$="/api/games/7/banner"]')
    if (banner) {
      fireEvent.error(banner)
    }

    const fallback = screen.getByTestId('game-preview-fallback-art')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveTextContent('Desenhe o macaco')
  })
})
