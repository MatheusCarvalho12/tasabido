import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as gamesApi from '@/lib/games'
import { TracingGamePage } from './TracingGamePage'

// Mock tanstack router useParams and useNavigate
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'escreva-seu-nome' }),
}))

describe('TracingGamePage (Ticket A3)', () => {
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

    vi.spyOn(gamesApi, 'fetchChildrenApi').mockResolvedValue({
      items: [{ id: 'child-123', name: 'João Pedro' }],
    })
    vi.spyOn(gamesApi, 'fetchPublicGamesApi').mockResolvedValue({
      items: [
        {
          id: 1,
          slug: 'escreva-seu-nome',
          titulo: 'Escreva seu nome',
          descricao: 'Treine a escrita do seu nome',
          tutorial: 'Passe o dedo nas letras',
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
  })

  it('renders intro state with child first name and uppercase accented letters', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    // Greeting should use first name "João"
    await waitFor(() => {
      expect(screen.getByText(/Oi, João!/i)).toBeInTheDocument()
    })

    // Glyphs for João: J, O, Ã, O
    expect(screen.getByText('Ã')).toBeInTheDocument()
    expect(screen.getByText(/Começar a brincar!/i)).toBeInTheDocument()
  })

  it('starts gameplay on primary button click and displays qualitative copy only (no numeric score)', async () => {
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

    // Qualitative Brazilian Portuguese copy
    expect(screen.getByText(/Passe o dedinho por cima da letra!/i)).toBeInTheDocument()

    // Assert that NO numeric score/percentage is visible to the child
    expect(screen.queryByText(/%/)).toBeNull()
    expect(screen.queryByText(/Score/i)).toBeNull()
    expect(screen.queryByText(/Pontuação/i)).toBeNull()
  })

  it('opens abandonment modal when back button is pressed and handles cancel/exit', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Voltar aos jogos/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Voltar aos jogos/i))

    // Abandonment modal should appear
    expect(screen.getByText(/Quer sair do jogo\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Continuar jogando/i)).toBeInTheDocument()
    expect(screen.getByText(/Sair para os jogos/i)).toBeInTheDocument()

    // Click cancel
    fireEvent.click(screen.getByText(/Continuar jogando/i))
    expect(screen.queryByText(/Quer sair do jogo\?/i)).toBeNull()

    // Reopen and confirm exit
    fireEvent.click(screen.getByLabelText(/Voltar aos jogos/i))
    fireEvent.click(screen.getByText(/Sair para os jogos/i))
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
  })
})
