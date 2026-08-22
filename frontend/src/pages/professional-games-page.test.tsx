import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as tracingAdapter from '@/lib/tracing/adapter'
import { ProfessionalGamesPage } from '@/pages/ProfessionalGamesPage'
import type { Game } from '@/types/game'

// vi.hoisted: mocks usados dentro das factories do vi.mock (hoisted acima dos
// imports — variáveis comuns não podem ser referenciadas lá).
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  fetchMyGames: vi.fn(),
  publishGame: vi.fn(),
  unpublishGame: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/lib/auth', () => ({
  getToken: () => 'token-de-teste',
  clearAuth: vi.fn(),
}))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    fetchMeApi: vi.fn().mockResolvedValue({
      id: '1',
      name: 'Carla Souza',
      email: 'carla@tasabido.app',
      role: 'professional',
    }),
  }
})

vi.mock('@/lib/games', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/games')>()
  return {
    ...actual,
    fetchMyGamesApi: mocks.fetchMyGames,
    publishGameApi: mocks.publishGame,
    unpublishGameApi: mocks.unpublishGame,
  }
})

vi.mock('@/lib/tracing/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tracing/adapter')>()
  return {
    ...actual,
    fetchLinkedChildrenApi: vi.fn().mockResolvedValue([]),
    fetchTracingRunsListApi: vi.fn().mockResolvedValue([]),
    fetchTracingRunReplayApi: vi.fn(),
  }
})

function fakeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    slug: 'escreva-seu-nome',
    titulo: 'Escreva seu nome',
    descricao: 'Atividade.',
    tutorial: 'Tutorial.',
    categoria: 'escrita',
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfessionalGamesPage />
    </QueryClientProvider>,
  )
}

describe('ProfessionalGamesPage (Tickets A4 & A5 Real APIs)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchMyGames.mockResolvedValue({
      items: [
        fakeGame({ id: 1, titulo: 'Escreva seu nome', status: 'published' }),
        fakeGame({ id: 2, titulo: 'Complete as formas', status: 'draft' }),
      ],
    })
    vi.mocked(tracingAdapter.fetchLinkedChildrenApi).mockResolvedValue([])
    vi.mocked(tracingAdapter.fetchTracingRunsListApi).mockResolvedValue([])
  })

  it('lista os jogos do profissional com título, status e stats', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Meus jogos' })).toBeInTheDocument()
    expect(screen.getByText('Crie e gerencie os jogos das suas crianças')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Escreva seu nome' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Complete as formas' })).toBeInTheDocument()
    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
  })

  it('mostra mensagem honesta quando não há crianças vinculadas e oculta personalização', async () => {
    renderPage()

    expect(
      await screen.findByText(
        'Nenhuma criança vinculada para personalização individual de parâmetros.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ajustar por criança/i })).toBeNull()
  })

  it('mostra mensagem honesta quando não há partidas gravadas na auditoria', async () => {
    renderPage()

    expect(await screen.findByText('Nenhuma partida registrada até o momento.')).toBeInTheDocument()
  })

  it('filtro Rascunhos mostra só os rascunhos', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('tab', { name: /Rascunhos/ }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Escreva seu nome' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Complete as formas' })).toBeInTheDocument()
  })

  it('filtro Publicados mostra só os publicados', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('tab', { name: /Publicados/ }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Complete as formas' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Escreva seu nome' })).toBeInTheDocument()
  })

  it('botão Criar jogo navega para o formulário', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /Criar jogo/ }))

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/profissional/novo' })
  })

  it('mostra estado vazio honesto quando não há jogos', async () => {
    mocks.fetchMyGames.mockResolvedValue({ items: [] })
    renderPage()

    expect(await screen.findByText('Nenhum jogo por aqui ainda.')).toBeInTheDocument()
    expect(
      screen.getByText('Crie o primeiro jogo das suas crianças — é rapidinho.'),
    ).toBeInTheDocument()
  })

  it('despublicar chama a API de despublicar', async () => {
    mocks.unpublishGame.mockResolvedValue(fakeGame({ status: 'draft' }))
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /Despublicar/ }))

    await waitFor(() => {
      expect(mocks.unpublishGame).toHaveBeenCalledWith(1)
    })
  })

  it('permite abrir o modal de personalização por criança quando há crianças vinculadas', async () => {
    vi.mocked(tracingAdapter.fetchLinkedChildrenApi).mockResolvedValue([
      { child_id: 'child-10', name: 'Lucas', assignments: [{ assignment_id: 201, game_id: 1 }] },
    ])

    renderPage()

    const customizeBtns = await screen.findAllByRole('button', { name: /Ajustar por criança/i })
    expect(customizeBtns.length).toBeGreaterThanOrEqual(1)

    const targetBtn = customizeBtns[0]
    if (!targetBtn) throw new Error('Target button not found')
    fireEvent.click(targetBtn)

    expect(await screen.findByText(/Ajustes de Traçado: Lucas/i)).toBeInTheDocument()
    expect(screen.getByText(/Jogo: Escreva seu nome/i)).toBeInTheDocument()
    expect(screen.getByText(/Salvar personalização/i)).toBeInTheDocument()
  })
})
