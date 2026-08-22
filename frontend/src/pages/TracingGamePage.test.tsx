import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as gamesApi from '@/lib/games'
import { TracingGamePage } from './TracingGamePage'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'escreva-seu-nome' }),
}))

describe('TracingGamePage (Ticket A3 Child Flow & States)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    mockNavigate.mockClear()

    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn()
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn()
    }
  })

  it('renders loading state while queries are pending', () => {
    vi.spyOn(gamesApi, 'fetchChildrenApi').mockReturnValue(new Promise(() => {}))
    vi.spyOn(gamesApi, 'fetchPublicGamesApi').mockReturnValue(new Promise(() => {}))

    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    expect(screen.getByText(/Carregando a brincadeira\.\.\./i)).toBeInTheDocument()
  })

  it('renders error state with retry and back buttons on API failure', async () => {
    vi.spyOn(gamesApi, 'fetchChildrenApi').mockRejectedValue(new Error('Network error'))
    vi.spyOn(gamesApi, 'fetchPublicGamesApi').mockResolvedValue({ items: [] })

    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Tentar novamente/i)).toBeInTheDocument()
    expect(screen.getByText(/Voltar aos jogos/i)).toBeInTheDocument()
  })

  it('renders error state when family has no registered children', async () => {
    vi.spyOn(gamesApi, 'fetchChildrenApi').mockResolvedValue({ items: [] })
    vi.spyOn(gamesApi, 'fetchPublicGamesApi').mockResolvedValue({ items: [] })

    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma criança encontrada/i)).toBeInTheDocument()
    })
  })

  it('renders explicit error state when child name contains unsupported glyphs (no silent skip/fallback)', async () => {
    vi.spyOn(gamesApi, 'fetchChildrenApi').mockResolvedValue({
      items: [{ id: 'child-unsupported', name: 'M9ller' }],
    })
    vi.spyOn(gamesApi, 'fetchPublicGamesApi').mockResolvedValue({
      items: [
        {
          id: 1,
          slug: 'escreva-seu-nome',
          titulo: 'Escreva seu nome',
          descricao: '',
          tutorial: '',
          categoria: 'escrita',
          visibilidade: 'public',
          status: 'published',
          svg_url: null,
          thumb_url: null,
          banner_url: null,
          cores: ['#48c3c7'],
          stats: { partidas: 0, tempo_medio_min: 0, score_medio: 0 },
        },
      ],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/caracteres não suportados para traçado: 9/i)).toBeInTheDocument()
    expect(screen.queryByText(/Começar a brincar!/i)).toBeNull()
  })

  it('renders intro state with real child first name and handles Ü in Müller', async () => {
    vi.spyOn(gamesApi, 'fetchChildrenApi').mockResolvedValue({
      items: [{ id: 'child-1', name: 'Müller da Silva' }],
    })
    vi.spyOn(gamesApi, 'fetchPublicGamesApi').mockResolvedValue({
      items: [
        {
          id: 1,
          slug: 'escreva-seu-nome',
          titulo: 'Escreva seu nome',
          descricao: 'Treine a escrita',
          tutorial: 'Passe o dedo',
          categoria: 'escrita',
          visibilidade: 'public',
          status: 'published',
          svg_url: null,
          thumb_url: null,
          banner_url: null,
          cores: ['#48c3c7'],
          stats: { partidas: 10, tempo_medio_min: 5, score_medio: 90 },
        },
      ],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Oi, Müller!/i)).toBeInTheDocument()
    })

    // Glyphs for Müller: M, Ü, L, L, E, R
    expect(screen.getByText('Ü')).toBeInTheDocument()
    expect(screen.getByText(/Começar a brincar!/i)).toBeInTheDocument()
  })

  it('starts gameplay on primary button click and displays qualitative copy only (no numeric score)', async () => {
    vi.spyOn(gamesApi, 'fetchChildrenApi').mockResolvedValue({
      items: [{ id: 'child-1', name: 'Vitória' }],
    })
    vi.spyOn(gamesApi, 'fetchPublicGamesApi').mockResolvedValue({
      items: [
        {
          id: 1,
          slug: 'escreva-seu-nome',
          titulo: 'Escreva seu nome',
          descricao: 'Treine a escrita',
          tutorial: 'Passe o dedo',
          categoria: 'escrita',
          visibilidade: 'public',
          status: 'published',
          svg_url: null,
          thumb_url: null,
          banner_url: null,
          cores: ['#48c3c7'],
          stats: { partidas: 10, tempo_medio_min: 5, score_medio: 90 },
        },
      ],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Começar a brincar!/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Começar a brincar!/i))

    // Gameplay canvas should now be visible
    expect(screen.getByTestId('tracing-canvas-container')).toBeInTheDocument()
    expect(screen.getByText(/Passe o dedinho por cima da letra!/i)).toBeInTheDocument()

    // Assert that NO numeric score/percentage is visible to the child
    expect(screen.queryByText(/%/)).toBeNull()
    expect(screen.queryByText(/Score/i)).toBeNull()
    expect(screen.queryByText(/Pontuação/i)).toBeNull()
  })

  it('opens abandonment modal on back button click and handles cancel/confirm with honest copy', async () => {
    vi.spyOn(gamesApi, 'fetchChildrenApi').mockResolvedValue({
      items: [{ id: 'child-1', name: 'André' }],
    })
    vi.spyOn(gamesApi, 'fetchPublicGamesApi').mockResolvedValue({
      items: [
        {
          id: 1,
          slug: 'escreva-seu-nome',
          titulo: 'Escreva seu nome',
          descricao: 'Treine a escrita',
          tutorial: 'Passe o dedo',
          categoria: 'escrita',
          visibilidade: 'public',
          status: 'published',
          svg_url: null,
          thumb_url: null,
          banner_url: null,
          cores: ['#48c3c7'],
          stats: { partidas: 10, tempo_medio_min: 5, score_medio: 90 },
        },
      ],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Voltar aos jogos/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Voltar aos jogos/i))

    // Abandonment modal should appear with honest copy
    expect(screen.getByText(/Quer sair do jogo\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Você poderá jogar de novo quando quiser\./i)).toBeInTheDocument()

    // Click cancel to resume playing
    fireEvent.click(screen.getByText(/Continuar jogando/i))
    expect(screen.queryByText(/Quer sair do jogo\?/i)).toBeNull()

    // Reopen and confirm exit
    fireEvent.click(screen.getByLabelText(/Voltar aos jogos/i))
    fireEvent.click(screen.getByText(/Sair para os jogos/i))
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
  })
})
