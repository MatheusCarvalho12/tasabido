import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as gamesApi from '@/lib/games'
import * as tracingAdapter from '@/lib/tracing/adapter'
import type { BackendTracingRunOut } from '@/lib/tracing/types'
import { TracingGamePage } from './TracingGamePage'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'escreva-seu-nome' }),
}))

describe('TracingGamePage (Ticket A3 / A5 Authoritative Child Flow & States)', () => {
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
    vi.restoreAllMocks()

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
      expect(screen.getByText(/Ops, precisamos de ajuda!/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Tentar de novo/i)).toBeInTheDocument()
    expect(screen.getByText(/Voltar ao início/i)).toBeInTheDocument()
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
      expect(screen.getByText(/Ops, precisamos de ajuda!/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/caracteres não suportados para traçado: 9/i)).toBeInTheDocument()
    expect(screen.queryByText(/Brincar agora!/i)).toBeNull()
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
      expect(screen.getByText(/Vamos escrever o nome de Müller\?/i)).toBeInTheDocument()
    })

    // Glyphs for Müller: M, Ü, L, L, E, R
    expect(screen.getByText('Ü')).toBeInTheDocument()
    expect(screen.getByText(/Brincar agora!/i)).toBeInTheDocument()
  })

  it('starts authoritative run on primary button click and displays qualitative copy only (no numeric score)', async () => {
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

    const mockAuthoritativeRun: BackendTracingRunOut = {
      id: 101,
      game_id: 1,
      child_id: 'child-1',
      status: 'started',
      score: null,
      duration_seconds: null,
      glyph_set_id: 1,
      glyph_set_version: 'uppercase-block-v1',
      glyph_set_sha256: 'sha256:1111',
      threshold: 70,
      contact_mode: 'timed_pause',
      pause_grace_ms: 1500,
      scoring_version: 1,
      schema_version: 1,
      effective_config: { glyph_sequence: ['V', 'I', 'T', 'Ó', 'R', 'I', 'A'] },
      glyph_sequence: ['V', 'I', 'T', 'Ó', 'R', 'I', 'A'],
      glyph_set: {
        id: 1,
        version: 'uppercase-block-v1',
        artifact_sha256: 'sha256:1111',
        sha256: 'sha256:1111',
        artifact_path: 'svgs/glyphs/uppercase-block-v1.svg',
        style: 'uppercase-block',
        geometry: {
          V: [
            [
              [0.1, 0.0],
              [0.5, 1.0],
              [0.9, 0.0],
            ],
          ],
          I: [
            [
              [0.5, 0.0],
              [0.5, 1.0],
            ],
          ],
        },
        immutable: true,
      },
    }

    const startSpy = vi
      .spyOn(tracingAdapter, 'startTracingRunApi')
      .mockResolvedValueOnce(mockAuthoritativeRun)

    render(
      <QueryClientProvider client={queryClient}>
        <TracingGamePage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Brincar agora!/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Brincar agora!/i))

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith({ child_id: 'child-1' })
      expect(screen.getByText(/Letra V \(1 de 7\)/i)).toBeInTheDocument()
    })

    // Assert that NO numeric score/percentage is visible to the child
    expect(screen.queryByText(/85%/)).toBeNull()
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
      expect(screen.getByLabelText(/Voltar para o início/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Voltar para o início/i))

    // Abandonment modal should appear with honest copy
    expect(screen.getByText(/Quer sair da brincadeira\?/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Se você sair agora, seu progresso nesta partida será salvo\./i),
    ).toBeInTheDocument()

    // Click cancel to resume playing
    fireEvent.click(screen.getByText(/Continuar brincando/i))
    expect(screen.queryByText(/Quer sair da brincadeira\?/i)).toBeNull()

    // Reopen and confirm exit
    fireEvent.click(screen.getByLabelText(/Voltar para o início/i))
    const confirmExitBtn = screen.getByRole('button', { name: /Sair agora/i })
    fireEvent.click(confirmExitBtn)
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
  })
})
